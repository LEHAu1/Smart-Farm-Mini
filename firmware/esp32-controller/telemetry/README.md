# ESP32 telemetry firmware

This PlatformIO project publishes telemetry for the assembled demo sensors to
`smartfarm/device/{DeviceCode}/telemetry` using QoS 1.

## Local configuration and build

1. Copy `include/config.example.h` to `include/config.h`.
2. Set Wi-Fi credentials, the registered device code, broker host and
   per-device MQTT credentials. Keep the local `config.h` private; Git ignores it.
   DeviceCode must match the Backend rule `[A-Za-z0-9_-]{1,50}` exactly; do not
   include spaces.
3. Keep TLS enabled. For EMQX Cloud, use the deployment endpoint on port 8883
   and download the CA certificate for that deployment from the EMQX Cloud
   console. Do not reuse the Backend username for the device. The firmware
   refuses TLS MQTT while the CA is a placeholder or UTC is unsynchronized,
   and retries time synchronization before connecting.
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
- The firmware subscribes to its device command topic and publishes QoS 1 ACKs to
  the matching `/ack` topic. It validates `commandId` and `createdAtUtc`, rejects
  expired or unverifiable commands, and stores/replays a `Failed` ACK in ESP32
  NVS for duplicate QoS 1 deliveries (32 entries, 10-minute default window).
- This telemetry build has no relay/pump control: every command returns `Failed`
  with an actuator-unavailable reason. It never reports `Acknowledged` or
  `Completed`, and it never actuates hardware. Keep the firmware's
  `CommandMaxAgeSeconds` aligned with backend `Mqtt:PendingCommandExpiryMinutes`.

## Host protocol helper tests

`tests/command_protocol_tests.cpp` exercises root-level JSON parsing, UTC expiry,
action allowlisting, and duplicate ACK retention without Arduino or hardware.
On a host with a C++17 compiler, compile and run it with:

```sh
c++ -std=c++17 tests/command_protocol_tests.cpp -o command_protocol_tests
./command_protocol_tests
```

Current verification: `pio run` succeeded on the Windows host after removing
PlatformIO's default `-std=gnu++11` flag and keeping `-std=gnu++17`. The host
protocol test was not run because no host C++ compiler is available in this
environment. This was a compile-only build; firmware was not uploaded and no
hardware or MQTT broker was contacted.
