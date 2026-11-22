#include <Arduino.h>
#include <DHT.h>
#include <MQTT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>
#if __has_include("config.h")
#include "config.h"
#else
#include "config.example.h"
#endif

#include <array>
#include <cmath>
#include <cstdio>
#include <cstring>

// This telemetry path intentionally has no relay, pump, command subscription,
// or application-level acknowledgement. GPIO34 raw soil ADC is diagnostic only
// until the probe is calibrated in soil; it is not published as a percentage.
constexpr uint8_t SoilMoisturePin = 34;

WiFiClientSecure secureNetwork;
WiFiClient plainNetwork;
MQTTClient mqtt(256);
DHT dht(config::DhtDataPin, DHT11);

struct PendingTelemetry {
  bool occupied = false;
  char sensorType[24] = {};
  char unit[8] = {};
  char messageId[37] = {};
  char recordedAtUtc[21] = {};
  float value = 0.0F;
};

std::array<PendingTelemetry, config::PendingQueueCapacity> pending;
uint8_t queueHead = 0;
uint8_t queueSize = 0;
uint32_t lastSampleAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastMqttAttemptAt = 0;
bool timeSyncAttempted = false;
bool wifiAttempted = false;
bool mqttAttempted = false;
uint32_t lastConfigWarningAt = 0;
char lastConfigWarning[128] = {};

void warnConfigAtMostOncePerMinute(const char* warning) {
  const uint32_t now = millis();
  if (std::strcmp(lastConfigWarning, warning) != 0 ||
      now - lastConfigWarningAt >= 60000) {
    Serial.println(warning);
    std::snprintf(lastConfigWarning, sizeof(lastConfigWarning), "%s", warning);
    lastConfigWarningAt = now;
  }
}

bool isPlaceholder(const char* value) {
  return value == nullptr || value[0] == '\0' || std::strncmp(value, "REPLACE_", 8) == 0;
}

bool validDeviceCode() {
  if (isPlaceholder(config::DeviceCode)) return false;
  for (const char* cursor = config::DeviceCode; *cursor != '\0'; ++cursor) {
    if (*cursor == '/' || *cursor == '+' || *cursor == '#') return false;
  }
  return true;
}

void createMessageId(char (&destination)[37]) {
  uint8_t bytes[16];
  for (uint8_t index = 0; index < sizeof(bytes); index += 4) {
    const uint32_t randomValue = esp_random();
    std::memcpy(bytes + index, &randomValue, sizeof(randomValue));
  }
  bytes[6] = static_cast<uint8_t>((bytes[6] & 0x0F) | 0x40);  // UUID v4
  bytes[8] = static_cast<uint8_t>((bytes[8] & 0x3F) | 0x80);
  std::snprintf(destination, sizeof(destination),
                "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-"
                "%02x%02x%02x%02x%02x%02x",
                bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5],
                bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11],
                bytes[12], bytes[13], bytes[14], bytes[15]);
}

void setUtcTimestamp(char (&destination)[21]) {
  const time_t now = time(nullptr);
  if (now < 1700000000) {
    destination[0] = '\0';
    return;
  }

  struct tm utcTime {};
  gmtime_r(&now, &utcTime);
  std::snprintf(destination, sizeof(destination), "%04d-%02d-%02dT%02d:%02d:%02dZ",
                utcTime.tm_year + 1900, utcTime.tm_mon + 1, utcTime.tm_mday,
                utcTime.tm_hour, utcTime.tm_min, utcTime.tm_sec);
}

void enqueue(const char* sensorType, float value, const char* unit) {
  // Keep one newest sample per sensor while offline. The stable messageId is
  // retained for QoS 1 retries; this bounded queue is RAM-only and is lost on reboot.
  for (uint8_t offset = 0; offset < queueSize; ++offset) {
    const uint8_t index = static_cast<uint8_t>((queueHead + offset) % pending.size());
    if (std::strcmp(pending[index].sensorType, sensorType) == 0) {
      pending[index].value = value;
      createMessageId(pending[index].messageId);
      setUtcTimestamp(pending[index].recordedAtUtc);
      return;
    }
  }

  if (queueSize == pending.size()) {
    queueHead = static_cast<uint8_t>((queueHead + 1) % pending.size());
    --queueSize;
    Serial.println("Telemetry queue full; discarded oldest pending sample.");
  }

  const uint8_t index = static_cast<uint8_t>((queueHead + queueSize) % pending.size());
  PendingTelemetry& message = pending[index];
  message = PendingTelemetry{};
  message.occupied = true;
  std::snprintf(message.sensorType, sizeof(message.sensorType), "%s", sensorType);
  std::snprintf(message.unit, sizeof(message.unit), "%s", unit);
  message.value = value;
  createMessageId(message.messageId);
  setUtcTimestamp(message.recordedAtUtc);
  ++queueSize;
}

void sampleSensors() {
  const float temperatureC = dht.readTemperature();
  const float humidityPercent = dht.readHumidity();
  if (std::isfinite(temperatureC)) enqueue("AirTemperature", temperatureC, "°C");
  else Serial.println("DHT11 temperature unavailable; sample skipped.");
  if (std::isfinite(humidityPercent)) enqueue("AirHumidity", humidityPercent, "%");
  else Serial.println("DHT11 humidity unavailable; sample skipped.");
  Serial.printf("DHT raw: T=%.1f C, RH=%.1f%%\n", temperatureC, humidityPercent);

  uint32_t soilAdcTotal = 0;
  constexpr uint8_t soilSampleCount = 8;
  for (uint8_t sample = 0; sample < soilSampleCount; ++sample) {
    soilAdcTotal += static_cast<uint16_t>(analogRead(SoilMoisturePin));
  }
  const uint16_t soilAdcRaw = static_cast<uint16_t>((soilAdcTotal + soilSampleCount / 2) / soilSampleCount);
  Serial.printf("YL-69 raw ADC diagnostic: %u (not calibrated; no soil percentage published).\n", soilAdcRaw);

  // INPUT_PULLUP plus the float wired to GND makes LOW mean closed. This
  // configured mapping is explicitly binary (0/100), not measured tank level.
  const bool contactClosed = digitalRead(config::FloatSwitchPin) == LOW;
  const bool waterPresent = contactClosed == config::FloatClosedMeansWaterPresent;
  enqueue("WaterLevel", waterPresent ? config::WaterPresentPercent : config::WaterAbsentPercent, "%");
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  if (isPlaceholder(config::WifiSsid) || isPlaceholder(config::WifiPassword)) {
    warnConfigAtMostOncePerMinute("Wi-Fi config is incomplete; copy include/config.example.h to include/config.h and set credentials.");
    return false;
  }

  const uint32_t now = millis();
  if (wifiAttempted && now - lastWifiAttemptAt < config::WifiRetryIntervalMs) return false;
  lastWifiAttemptAt = now;
  wifiAttempted = true;
  Serial.printf("Connecting to configured Wi-Fi (attempt at %lu ms).\n",
                static_cast<unsigned long>(now));
  WiFi.mode(WIFI_STA);
  WiFi.begin(config::WifiSsid, config::WifiPassword);
  return false;
}

bool configureTls() {
  if (!config::MqttUseTls) return true;
  if (isPlaceholder(config::MqttRootCa)) {
    warnConfigAtMostOncePerMinute("MQTT TLS is enabled but broker CA is unset; refusing insecure connection.");
    return false;
  }
  secureNetwork.setCACert(config::MqttRootCa);
  return true;
}

bool connectMqtt() {
  if (mqtt.connected()) return true;
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!validDeviceCode() || isPlaceholder(config::MqttHost) ||
      isPlaceholder(config::MqttUsername) || isPlaceholder(config::MqttPassword)) {
    warnConfigAtMostOncePerMinute("MQTT/device config is incomplete; set it in local include/config.h.");
    return false;
  }

  const uint32_t now = millis();
  if (mqttAttempted && now - lastMqttAttemptAt < config::MqttRetryIntervalMs) return false;
  lastMqttAttemptAt = now;
  mqttAttempted = true;
  if (!configureTls()) return false;

  const char* clientId = config::DeviceCode;
  const bool connected = mqtt.connect(clientId, config::MqttUsername, config::MqttPassword);
  if (connected) Serial.println("MQTT connected.");
  else Serial.printf("MQTT connect failed (library error %d).\n", static_cast<int>(mqtt.lastError()));
  return connected;
}

void synchronizeClock() {
  if (timeSyncAttempted || WiFi.status() != WL_CONNECTED) return;
  timeSyncAttempted = true;
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  const uint32_t startedAt = millis();
  while (time(nullptr) < 1700000000 && millis() - startedAt < 5000) delay(100);
  if (time(nullptr) < 1700000000) Serial.println("NTP time unavailable; telemetry omits recordedAtUtc.");
}

bool publishNext() {
  if (queueSize == 0 || !mqtt.connected()) return false;
  PendingTelemetry& message = pending[queueHead];
  char topic[128];
  std::snprintf(topic, sizeof(topic), "smartfarm/device/%s/telemetry", config::DeviceCode);

  char payload[256];
  const int written = message.recordedAtUtc[0] == '\0'
      ? std::snprintf(payload, sizeof(payload),
                      "{\"messageId\":\"%s\",\"sensorType\":\"%s\",\"value\":%.2f,\"unit\":\"%s\"}",
                      message.messageId, message.sensorType, message.value, message.unit)
      : std::snprintf(payload, sizeof(payload),
                      "{\"messageId\":\"%s\",\"sensorType\":\"%s\",\"value\":%.2f,\"unit\":\"%s\",\"recordedAtUtc\":\"%s\"}",
                      message.messageId, message.sensorType, message.value, message.unit,
                      message.recordedAtUtc);
  if (written <= 0 || static_cast<size_t>(written) >= sizeof(payload)) {
    Serial.println("Telemetry serialization failed; dropping malformed sample.");
    pending[queueHead] = PendingTelemetry{};
    queueHead = static_cast<uint8_t>((queueHead + 1) % pending.size());
    --queueSize;
    return false;
  }

  const bool acknowledged = mqtt.publish(topic, payload, written, false, 1);
  if (!acknowledged) {
    Serial.printf("QoS 1 telemetry publish not acknowledged for %s; will retry.\n", message.sensorType);
    return false;
  }

  Serial.printf("Telemetry acknowledged: %s (%s).\n", message.sensorType, message.messageId);
  pending[queueHead] = PendingTelemetry{};
  queueHead = static_cast<uint8_t>((queueHead + 1) % pending.size());
  --queueSize;
  return true;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(SoilMoisturePin, INPUT);
  pinMode(config::FloatSwitchPin, INPUT_PULLUP);
  dht.begin();
  WiFi.setAutoReconnect(true);

  if (config::MqttUseTls) mqtt.begin(config::MqttHost, config::MqttPort, secureNetwork);
  else mqtt.begin(config::MqttHost, config::MqttPort, plainNetwork);
  mqtt.setOptions(30, true, 3000);
  Serial.println("Smart Farm Mini telemetry firmware; no actuator or command path.");
  Serial.println("YL-69 raw ADC is diagnostic only until in-soil calibration is configured.");
}

void loop() {
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    synchronizeClock();
    connectMqtt();
  }
  if (mqtt.connected()) mqtt.loop();

  const uint32_t now = millis();
  if (now - lastSampleAt >= config::SampleIntervalMs) {
    lastSampleAt = now;
    sampleSensors();
  }
  publishNext();
  delay(10);
}
