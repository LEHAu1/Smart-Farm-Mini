#pragma once

#include <Arduino.h>

namespace config {
// Copy this file to config.h and replace every REPLACE_* value locally.
// config.h is ignored by Git and must never be committed with credentials.
constexpr char WifiSsid[] = "REPLACE_WITH_WIFI_SSID";
constexpr char WifiPassword[] = "REPLACE_WITH_WIFI_PASSWORD";
constexpr char DeviceCode[] = "REPLACE_WITH_REGISTERED_DEVICE_CODE";

constexpr char MqttHost[] = "REPLACE_WITH_MQTT_HOST";
constexpr uint16_t MqttPort = 8883;
constexpr char MqttUsername[] = "REPLACE_WITH_DEVICE_MQTT_USERNAME";
constexpr char MqttPassword[] = "REPLACE_WITH_DEVICE_MQTT_PASSWORD";
constexpr bool MqttUseTls = true;
// Insert the PEM CA certificate that validates this broker. TLS deliberately
// refuses to connect while this value is still a placeholder.
constexpr char MqttRootCa[] = R"PEM(REPLACE_WITH_BROKER_ROOT_CA_PEM)PEM";

constexpr uint8_t DhtDataPin = 4;
constexpr uint8_t FloatSwitchPin = 27;
// Current reported mapping: open contact means water present. Reverse only
// after confirming the physical float-switch behavior.
constexpr bool FloatClosedMeansWaterPresent = false;
constexpr float WaterPresentPercent = 100.0F;
constexpr float WaterAbsentPercent = 0.0F;

constexpr uint32_t SampleIntervalMs = 10000;
constexpr uint32_t WifiRetryIntervalMs = 10000;
constexpr uint32_t MqttRetryIntervalMs = 5000;
constexpr uint8_t PendingQueueCapacity = 4;
}  // namespace config
