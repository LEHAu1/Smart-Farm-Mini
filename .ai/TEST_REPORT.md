# Test Report

Date: 2026-11-17 (Asia/Saigon)
Branch: `feature/iot-end-to-end-integration`
Baseline commit: `772cfef`

## Baseline before SF-8 work

| Component | Command / check | Result | Notes |
|---|---|---|---|
| Frontend | `npm test` | PASS, 5/5 | Existing login UI tests |
| Frontend | `npm run build` | PASS | TypeScript check and Vite production build |
| Backend | `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore` | PASS, 147/147 after API-PROFILE-TESTS | Target `net10.0`; no database migration run |
| API runtime | GET `/health/live`, Swagger UI | PASS, HTTP 200 | API ran on `127.0.0.1:5206` with MQTT disabled |
| Database readiness | GET `/health/ready` | BLOCKED, HTTP 503 after ~15s | Local SQL Server unavailable; no data changed |
| Frontend render | Headless Chrome DOM dump | PASS for `/dashboard`, `/login`, `/devices`, `/not-a-route` | Confirms React mounted; not an interactive browser test |
| MQTT / SignalR / hardware | Broker/device/physical checks | PARTIAL | MQTT/SignalR not verified end-to-end; user reports assembled ESP32 hardware was physically tested and stable, and provided sensor serial output. |

## SF-8 verification

| Check | Result | Evidence / limits |
|---|---|---|
| `npm.cmd test` | PASS, 7/7 in 2 files | Covers sample values/statuses, global mock labeling and responsive breakpoint classes |
| `npm.cmd run build` | PASS | TypeScript check and Vite production build |
| `git diff --check` | PASS | No whitespace errors |
| API/MQTT/hardware side effects | None | Dashboard reads static local data only |
| Independent review | PASS | Verifier confirmed all 4 GitHub #8 acceptance criteria from source/tests |
| Visual in-app browser viewport test | NOT VERIFIED | In-app browser control bridge unavailable; responsive behavior verified from breakpoint classes/test, no screenshot claimed |

## API-PROFILE-TESTS verification

| Check | Result | Evidence / limits |
|---|---|---|
| Full backend unit suite | PASS, 147/147 | Backend Agent ran `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore` after adding the tests |
| Focused new tests | PASS, 4/4 | Independent Verifier ran `dotnet test ... --filter FullyQualifiedName~AuthProfileServiceTests`; no DB query performed |
| Independent source review | PASS | Assertions match existing AuthService trimming, Identity success/failure handling and role fallback; no production code changed |
| Live SQL/Identity runtime | NOT VERIFIED | Local SQL Server unavailable; no migration or database access used |

## AUTH-FE verification

| Check | Result | Evidence / limits |
|---|---|---|
| Frontend unit/component suite | PASS, 15/15 in 3 files | Includes login contract/errors, route guard, concurrent 401 refresh/retry, refresh failure cleanup, and token rotation during `/me` restoration |
| `npm.cmd run build` | PASS | TypeScript check and Vite production build |
| Independent source/test review | PASS | Verifier independently ran the suite/build and reviewed interceptor retry bounds, auth endpoint exclusions, and session events |
| SQL-backed login and live API | NOT VERIFIED | Local SQL Server readiness is unavailable; no account could be authenticated |
| Interactive in-app browser | NOT VERIFIED | Browser control bridge could not be initialized |

## SF-18 verification

| Check | Result | Evidence / limits |
|---|---|---|
| Frontend unit/component suite | PASS, 21/21 in 5 files | Covers hub path/JWT/event wiring, token refresh, initial connection retry/cleanup, actual `DeviceDto` snapshot normalization, telemetry/device updates, reconnect status and stale threshold |
| `npm.cmd run build` | PASS | TypeScript check and Vite production build |
| Independent source/contract review | PASS | Verifier matched client events and DTOs with `[Authorize] SensorHub`, JWT query handling, `SensorHubNotifier`, and `DevicesController`/`DeviceDto` |
| HTTP readiness | PASS | Frontend `/login` and `/dashboard` return HTTP 200 at ports 5173 and 5174; API `/health/live` returns HTTP 200 at 5206 |
| Live authenticated SignalR/telemetry | NOT VERIFIED | SQL-backed login is unavailable; no MQTT broker/device telemetry configured |
| Interactive browser/console/network review | NOT VERIFIED | Browser control bridge reports it is not trusted/unavailable; HTTP readiness is not claimed as UI verification |
| Device-control side effects | None | Dashboard does not invoke a hub method, command endpoint, MQTT publish, or actuator |

## Hardware wiring update

| Check | Result | Evidence / limits |
|---|---|---|
| Assembled hardware | USER-REPORTED TESTED AND STABLE | User confirms stable physical test; wiring photos and serial output are available in conversation, but no direct instrumentation is connected to this workspace |
| Sensor diagnostic sketch | USER-REPORTED RUN; not independently compiled/verified here | User provided serial JSON with DHT11 values, float contact changes, and soil ADC fixed at 4095 |
| Sensor interpretation | PARTIAL | DHT values are being read; float polarity mapping was inverted in the sketch per user report. During direct water immersion the soil ADC fell from 4095 through 2736–2885 to 1298–1459 (last four mean ≈1409). This confirms an analog response to water exposure, but is not a dry/wet-soil calibration; calibration remains pending |
| Relay and pump behavior | USER TEST SCOPE UNSPECIFIED | User reports hardware stable, but did not specify relay/pump switching or current measurement; relay input trigger polarity and product-listed 200mA vs startup/stall current remain undocumented |
| Hardware changes retained | Diagnostic plus telemetry-only firmware source | Both sketches leave GPIO26 untouched; MQTT project publishes contract telemetry only and has no command/actuator path |

## E2E integration development

| Check | Result | Evidence / limits |
|---|---|---|
| Frontend automated tests | PASS, 26/26 in 7 files | Includes persisted dashboard summary, realtime precedence, command service polling and mocked pump UI; no live command endpoint was invoked |
| Frontend production build | PASS | `npm.cmd run build` runs `tsc --noEmit` and Vite production build |
| Backend unit suite | PASS, 147/147 | `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore` |
| Backend solution build | PASS, 0 warnings/errors | `dotnet build Smart_Farm_Mini.slnx --no-restore` |
| MQTT message handler tests | PASS, 3/3 | Focused check of telemetry persistence/broadcast and ACK device/duplicate handling |
| Browser UI test | NOT VERIFIED | Browser control bridge could not initialize; localhost HTTP socket check was blocked/timed out |
| ESP32 telemetry firmware | SOURCE PRESENT / NOT COMPILED | PlatformIO metadata and MQTT QoS 1 sketch added; no firmware toolchain in environment |
| SQL/MQTT integration and ESP32 E2E | BLOCKED | SQL Server and broker not configured; telemetry source not compiled/flashed/configured |
| Real pump command | NOT RUN | No physical actuator was activated |
