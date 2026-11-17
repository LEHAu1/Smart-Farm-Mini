# ESP32 telemetry firmware

This PlatformIO project publishes telemetry for the assembled demo sensors to
`smartfarm/device/{DeviceCode}/telemetry` using QoS 1.

## Local configuration and build

1. Copy `include/config.example.h` to `include/config.h`.
2. Set Wi-Fi credentials, the registered device code, broker host and
   per-device MQTT credentials. Keep the local `config.h` private; Git ignores it.
3. Keep TLS enabled and provide the CA certificate that validates the broker.
   The example placeholders intentionally prevent a broker connection.
4. From this directory, run `pio run` to build for `esp32dev`.

The project pins the PlatformIO ESP32 platform and library versions in
`platformio.ini`. Do not share or commit a populated `config.h`.

## Telemetry scope

- DHT11 readings publish as `AirTemperature` (`°C`) and `AirHumidity` (`%`).
- The two-wire float publishes `WaterLevel` as a binary value: `100%` means
  `waterPresent`, and `0%` means absent, using the configured contact mapping.
- YL-69 readings are omitted until an in-soil calibration exists; raw ADC values
  and direct-water immersion readings are not moisture percentages.
- A bounded in-memory queue retries unacknowledged QoS 1 samples. Pending data
  is lost on power reset.
- This firmware has no relay/pump control, MQTT command subscription, or ACK path.
