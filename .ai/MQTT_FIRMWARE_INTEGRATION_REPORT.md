# MQTT and Firmware Branch Integration Report

**Date:** 2026-11-22 (Asia/Saigon)
**Target branch:** `feature/iot-end-to-end-integration`
**Source:** `origin/develop` at `56a1937be6e3b1abd6fbccba5dba93c5919fece8`
**Target before integration:** `f4d533b17a7e273bec4072ff12d3ae5f136815ee`
**Push:** Not performed.

## Integration summary

- Merged the develop frontend and API updates while retaining the target branch's strict localhost CORS origins.
- Kept the MQTT telemetry topic and payload contract consistent between firmware and backend: `smartfarm/device/{deviceCode}/telemetry`, QoS 1, with JSON message IDs, sensor type, value, unit, and optional timestamp.
- Preserved firmware MQTT timeout settings and DHT11/raw ADC diagnostics. Soil moisture is not published as a percentage until calibrated in actual soil; raw YL-69 ADC remains diagnostic only.
- Added retry after an initial SignalR connection failure. Device status changes refresh the server summary instead of incrementing aggregate counts per event.
- Removed UI behavior that treated a pending/acknowledged command as proof that the physical pump changed state. The irrigation UI now explains that backend acceptance does not confirm the relay or pump state; the current telemetry firmware has no command receiver or relay-control path.
- Removed obsolete frontend auth/SignalR modules and tests that no longer match the develop context/service architecture. Updated the remaining login tests to mock the API boundary and to respect username-or-email login behavior.
- Corrected the dashboard sensor label to DHT11.
- Removed committed development JWT/SQL credentials from `appsettings.Development.json`. Local JWT signing material must be supplied through user-secrets or the runtime environment.
- Corrected `.env.example` to ASP.NET Core configuration key names. MQTT is disabled in the template until local broker credentials are configured. The backend uses loopback when the broker runs on the same laptop; ESP32 configuration must separately use the laptop's LAN address.

## Verification

| Check | Result | Evidence / limits |
|---|---|---|
| Backend unit tests | PASS, 147/147 | `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore -p:BaseOutputPath=bin/isolated-test/ --verbosity minimal` |
| Frontend unit tests | PASS, 9/9 | `npm test` in a clean temporary copy using the committed lockfile; 3 test files passed |
| Frontend typecheck and production build | PASS | `npm run build` in the same clean copy; Vite completed. It emitted a non-blocking warning that the main JS chunk exceeds 500 kB. |
| Frontend HTTP smoke | PASS | Temporary frontend copy returned HTTP 200 for `/login` on localhost:5174. This is HTTP verification, not interactive browser verification. |
| Browser MCP UI check | NOT VERIFIED | Browser MCP reports Chrome is not connected and requests extension update to 2.0. The user-indicated localhost:9011 endpoint refused the connection during this check. |
| Firmware compile | PASS | `platformio run` with a temporary `PLATFORMIO_CORE_DIR`; ESP32 image built successfully. RAM 47,072 / 327,680 bytes; flash 911,017 / 1,310,720 bytes. No firmware was uploaded. |
| Database migration / live SQL | NOT RUN | Develop adds manual SQL scripts `03_AddGoogleAuth_v2_2.sql` and `04_SoftDelete_Devices_v2_3.sql`; neither was applied to any database. |
| MQTT broker / ESP32 end-to-end | NOT VERIFIED | No live broker-to-database-to-SignalR session was exercised in this integration run. User previously reported stable hardware operation; this report does not treat that as a test performed here. |
| Physical pump command | NOT RUN | No relay or pump command was sent. |

## Setup notes and remaining work

1. Supply `JwtSettings:SecretKey` with `dotnet user-secrets` before starting the API. Supply a local SQL connection string if the default Windows-auth connection does not fit the developer machine.
2. Configure backend MQTT settings with `Mqtt__Host`, `Mqtt__Port`, credentials and TLS matching the broker. A broker on the same PC can use `127.0.0.1`; the ESP32 cannot use loopback and needs the PC's reachable LAN address (or a reachable cloud broker).
3. Apply the two new database scripts only to the intended development database after checking its backup/state. They were deliberately not run here.
4. Update/connect the Browser MCP Chrome extension and start the frontend on port 9011 to run the requested interactive dashboard smoke test.
5. Calibrate the YL-69 using dry and saturated soil readings before enabling percentage publication. Firmware command reception, relay driving, physical-state acknowledgement and pump safety are still separate work; current UI/API command acceptance must not be read as physical confirmation.

## Integration state

Merge conflicts are resolved and backend, frontend, and firmware compilation passed. The integration is committed locally; no remote branch was changed. Browser UI and live hardware/database/MQTT end-to-end checks remain unverified as documented above.
