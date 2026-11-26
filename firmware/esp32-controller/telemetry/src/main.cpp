#include <Arduino.h>
#include <DHT.h>
#include <MQTT.h>
#include <Preferences.h>
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
#include <type_traits>
#include "command_protocol.h"

// This build has no relay/pump actuation. It accepts command envelopes only so
// it can reject them safely, enforce expiry/deduplication, and report Failed.
// GPIO34 raw soil ADC is diagnostic only until calibrated in soil.
constexpr uint8_t SoilMoisturePin = 34;
constexpr int64_t CommandMaxAgeSeconds = smartfarm::commands::DefaultCommandMaxAgeSeconds;
constexpr time_t MinimumTrustedUtcEpoch = 1700000000;
constexpr uint32_t UtcSyncRetryIntervalMs = 60000;
constexpr char CommandLedgerNamespace[] = "sf-command";
constexpr char CommandLedgerStorageKey[] = "ledger-v1";

WiFiClientSecure secureNetwork;
WiFiClient plainNetwork;
MQTTClient mqtt(512);
DHT dht(config::DhtDataPin, DHT11);
Preferences commandPreferences;
smartfarm::commands::CommandLedger commandLedger{};

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
uint32_t lastUtcSyncAttemptAt = 0;
bool utcSyncAttempted = false;
bool wifiAttempted = false;
bool mqttAttempted = false;
bool commandSubscribed = false;
bool commandLedgerReady = false;
uint32_t lastConfigWarningAt = 0;
char lastConfigWarning[128] = {};

bool subscribeToCommands();

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
  size_t length = 0;
  for (const char* cursor = config::DeviceCode; *cursor != '\0'; ++cursor) {
    const char character = *cursor;
    const bool allowed = (character >= 'A' && character <= 'Z') ||
                         (character >= 'a' && character <= 'z') ||
                         (character >= '0' && character <= '9') ||
                         character == '_' || character == '-';
    if (!allowed || ++length > 50) return false;
  }
  return length >= 1;
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
  if (mqtt.connected()) return subscribeToCommands();
  if (WiFi.status() != WL_CONNECTED) return false;
  if (config::MqttUseTls && time(nullptr) < MinimumTrustedUtcEpoch) {
    warnConfigAtMostOncePerMinute("Trusted UTC unavailable; refusing TLS MQTT connection.");
    return false;
  }
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
  if (!connected) {
    Serial.printf("MQTT connect failed (library error %d).\n", static_cast<int>(mqtt.lastError()));
    return false;
  }
  Serial.println("MQTT connected.");
  return subscribeToCommands();
}

void synchronizeClock() {
  if (time(nullptr) >= MinimumTrustedUtcEpoch || WiFi.status() != WL_CONNECTED) return;
  const uint32_t now = millis();
  if (utcSyncAttempted && now - lastUtcSyncAttemptAt < UtcSyncRetryIntervalMs) return;
  lastUtcSyncAttemptAt = now;
  utcSyncAttempted = true;
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  const uint32_t startedAt = millis();
  while (time(nullptr) < MinimumTrustedUtcEpoch && millis() - startedAt < 5000) delay(100);
  if (time(nullptr) < MinimumTrustedUtcEpoch) {
    warnConfigAtMostOncePerMinute("Trusted UTC unavailable; TLS MQTT connection is blocked until NTP succeeds.");
  }
}

bool initializeCommandLedger() {
  static_assert(std::is_trivially_copyable_v<smartfarm::commands::CommandLedger>);
  if (!commandPreferences.begin(CommandLedgerNamespace, false)) {
    Serial.println("Command NVS unavailable; all commands will be rejected.");
    return false;
  }

  const size_t storedSize = commandPreferences.getBytesLength(CommandLedgerStorageKey);
  if (storedSize == 0) {
    const size_t written = commandPreferences.putBytes(
        CommandLedgerStorageKey, &commandLedger, sizeof(commandLedger));
    if (written != sizeof(commandLedger)) {
      Serial.println("Command NVS initialization failed; all commands will be rejected.");
      return false;
    }
    return true;
  }

  if (storedSize != sizeof(commandLedger) ||
      commandPreferences.getBytes(CommandLedgerStorageKey, &commandLedger, sizeof(commandLedger)) != sizeof(commandLedger)) {
    Serial.println("Command NVS record is incompatible; all commands will be rejected.");
    commandLedger = smartfarm::commands::CommandLedger{};
    return false;
  }

  for (const auto& entry : commandLedger.entries) {
    if (entry.valid && (!smartfarm::commands::isValidCommandId(entry.acknowledgement.commandId) ||
                        std::strcmp(entry.acknowledgement.status, "Failed") != 0)) {
      Serial.println("Command NVS record failed validation; all commands will be rejected.");
      commandLedger = smartfarm::commands::CommandLedger{};
      return false;
    }
  }
  return true;
}

bool persistCommandLedger() {
  if (!commandLedgerReady) return false;
  return commandPreferences.putBytes(
             CommandLedgerStorageKey, &commandLedger, sizeof(commandLedger)) == sizeof(commandLedger);
}

bool publishCommandAcknowledgement(const smartfarm::commands::AckRecord& acknowledgement) {
  if (config::TelemetryOnly || !mqtt.connected()) return false;
  char topic[128];
  std::snprintf(topic, sizeof(topic), "smartfarm/device/%s/ack", config::DeviceCode);
  char payload[256];
  const int written = std::snprintf(
      payload, sizeof(payload),
      "{\"commandId\":\"%s\",\"status\":\"%s\",\"errorMessage\":\"%s\"}",
      acknowledgement.commandId, acknowledgement.status, acknowledgement.errorMessage);
  if (written <= 0 || static_cast<size_t>(written) >= sizeof(payload)) return false;
  return mqtt.publish(topic, payload, static_cast<size_t>(written), false, 1);
}

smartfarm::commands::AckRecord makeFailedAcknowledgement(
    const char* commandId, const char* errorMessage, int64_t nowEpoch) {
  smartfarm::commands::AckRecord acknowledgement{};
  std::snprintf(acknowledgement.commandId, sizeof(acknowledgement.commandId), "%s", commandId);
  std::snprintf(acknowledgement.status, sizeof(acknowledgement.status), "Failed");
  std::snprintf(acknowledgement.errorMessage, sizeof(acknowledgement.errorMessage), "%s", errorMessage);
  acknowledgement.expiresAtEpoch = nowEpoch + CommandMaxAgeSeconds;
  return acknowledgement;
}

void handleCommandMessage(String& topic, String& payload) {
  if (config::TelemetryOnly) return;

  char expectedTopic[128];
  std::snprintf(expectedTopic, sizeof(expectedTopic), "smartfarm/device/%s/command", config::DeviceCode);
  if (topic != expectedTopic) {
    Serial.println("Ignoring MQTT message on unexpected command topic.");
    return;
  }

  smartfarm::commands::CommandRequest command{};
  const bool parsed = smartfarm::commands::JsonReader(
      std::string_view(payload.c_str(), payload.length())).parseCommand(command);
  if (!smartfarm::commands::isValidCommandId(command.commandId)) {
    Serial.println("Ignoring command without a valid commandId; no ACK can be correlated.");
    return;
  }

  const time_t now = time(nullptr);
  if (now < MinimumTrustedUtcEpoch) {
    const auto failure = makeFailedAcknowledgement(
        command.commandId, "UTC unavailable; command expiry cannot be verified.", now);
    publishCommandAcknowledgement(failure);
    return;
  }

  smartfarm::commands::AckRecord previousAcknowledgement{};
  if (commandLedgerReady && commandLedger.find(command.commandId, now, previousAcknowledgement)) {
    if (!publishCommandAcknowledgement(previousAcknowledgement))
      Serial.println("Duplicate command ACK publish failed; it will be replayed on the next delivery.");
    return;
  }

  const char* failureReason = nullptr;
  if (!commandLedgerReady) {
    failureReason = "Persistent command deduplication unavailable; no action taken.";
  } else if (!parsed) {
    failureReason = "Malformed command or missing expiry timestamp; no action taken.";
  } else {
    const auto timestampValidity = smartfarm::commands::validateTimestamp(
        command.createdAtEpoch, now, CommandMaxAgeSeconds);
    if (timestampValidity == smartfarm::commands::TimestampValidity::Expired) {
      failureReason = "Command expired; no action taken.";
    } else if (timestampValidity == smartfarm::commands::TimestampValidity::TooFarInFuture) {
      failureReason = "Command timestamp is in the future; no action taken.";
    } else if (!smartfarm::commands::isSupportedAction(command.action)) {
      failureReason = "Unsupported command action; no action taken.";
    } else {
      // This telemetry firmware contains no actuator output by design. Never
      // report Acknowledged or Completed for a command it cannot execute.
      failureReason = "Actuator control is not implemented in telemetry firmware.";
    }
  }

  auto acknowledgement = makeFailedAcknowledgement(command.commandId, failureReason, now);
  if (!commandLedger.remember(acknowledgement, now)) {
    std::snprintf(acknowledgement.errorMessage, sizeof(acknowledgement.errorMessage),
                  "%s", "Command deduplication storage is full; no action taken.");
  }
  if (!persistCommandLedger()) {
    std::snprintf(acknowledgement.errorMessage, sizeof(acknowledgement.errorMessage),
                  "%s", "Persistent command deduplication write failed; no action taken.");
    commandLedgerReady = false;
  }
  if (!publishCommandAcknowledgement(acknowledgement))
    Serial.println("Command Failed ACK publish failed; broker/backend retry may redeliver it.");
  else
    Serial.printf("Command rejected safely: %s (%s).\n", acknowledgement.commandId, acknowledgement.errorMessage);
}

bool subscribeToCommands() {
  if (config::TelemetryOnly) {
    commandSubscribed = false;
    return mqtt.connected();
  }
  if (!mqtt.connected()) {
    commandSubscribed = false;
    return false;
  }
  if (commandSubscribed) return true;

  char topic[128];
  std::snprintf(topic, sizeof(topic), "smartfarm/device/%s/command", config::DeviceCode);
  commandSubscribed = mqtt.subscribe(topic, 1);
  if (commandSubscribed) Serial.printf("Subscribed to command topic %s.\n", topic);
  else Serial.println("Command topic subscription failed; retrying while connected.");
  return commandSubscribed;
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
  commandLedgerReady = !config::TelemetryOnly && initializeCommandLedger();
  if (!config::TelemetryOnly) mqtt.onMessage(handleCommandMessage);

  if (config::MqttUseTls) mqtt.begin(config::MqttHost, config::MqttPort, secureNetwork);
  else mqtt.begin(config::MqttHost, config::MqttPort, plainNetwork);
  mqtt.setOptions(30, true, 3000);
  if (config::TelemetryOnly)
    Serial.println("Smart Farm Mini telemetry-only firmware; command subscription and ACK publishing are disabled.");
  else
    Serial.println("Smart Farm Mini command intake fails closed and never actuates hardware.");
  Serial.println("YL-69 raw ADC is diagnostic only until in-soil calibration is configured.");
}

void loop() {
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    synchronizeClock();
    connectMqtt();
  }
  if (mqtt.connected()) mqtt.loop();
  else commandSubscribed = false;

  const uint32_t now = millis();
  if (now - lastSampleAt >= config::SampleIntervalMs) {
    lastSampleAt = now;
    sampleSensors();
  }
  publishNext();
  delay(10);
}
