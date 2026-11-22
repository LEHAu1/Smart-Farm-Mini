# Development Progress

## Current session

- **Date:** 2026-11-17 (Asia/Saigon)
- **Branch / baseline:** `feature/iot-end-to-end-integration` created from `develop` / `772cfef`; existing workspace changes were preserved on the new branch.
- **Git state at start:** modified/untracked files existed on `develop`; no files were discarded.
- **Change control:** user authorized branch/commit/push. Commit `a83bd74` was pushed to `origin/feature/iot-end-to-end-integration`; no PR was created.
- **Current task:** Extend existing auth/dashboard foundation toward telemetry and command integration; SF-8, SF-18 and API-PROFILE-TESTS retain their prior implemented/tested scopes.
- **Current environment:** React/Vite responded HTTP 200 at `http://127.0.0.1:5173` and `:5174`; Web API `/health/live` responded HTTP 200 at `http://127.0.0.1:5206`. Local SQL Server is unavailable and MQTT is disabled. User reports the assembled ESP32 hardware has been tested and runs stably; the board is not directly attached to this development environment.
- **Browser limitation:** In-app browser skill setup failed because its trusted control bridge is unavailable. Earlier headless Chrome verified React rendering, but interactive browser testing is not claimed for this session.
- **Firmware scope:** A sensor-only diagnostic sketch is present and the user supplied its serial telemetry, then reported stable hardware operation. GPIO26 remains untouched by the sketch; relay/pump actuation scope and independent bench verification are not recorded.

## Discovery

- Read root, backend, frontend, database, firmware, architecture, issue-test and Stitch design documentation.
- No separate SRS/use-case document was found; GitHub issues #1–41 plus repository documentation are used as the requirement sources.
- Current open high-priority software task selected from GitHub is issue #8. Its current Dashboard page is a scaffold and its acceptance criteria are explicit.
- Backend/frontend specialists and an independent verifier performed separate read-only inspections before implementation. Their findings are summarized in `REQUIREMENTS.md` and `BACKLOG.md`.

## Verified progress

| Task | Status | Evidence |
|---|---|---|
| SF-1..7, SF-9 baseline | Existing implementation; scoped states in `REQUIREMENTS.md` | Baseline frontend 5/5 tests + production build; backend 143/143 unit tests. API Swagger and `/health/live` returned HTTP 200. |
| SF-8 | DONE | Five sample sensor measurements and two device statuses are visibly marked as simulated. `npm.cmd test` 7/7; `npm.cmd run build` and diff check passed; independent verifier passed all issue acceptance criteria. |
| API-PROFILE-TESTS | DONE | Four AuthService tests added; backend suite 147/147 passed and independent verifier passed 4/4 focused checks. |
| AUTH-FE | DONE (local contract/tests) | Backend JWT login, refresh/retry, route guard and logout implemented; frontend 15/15 tests and build pass; independent verifier PASS. Live SQL-backed authentication remains NOT VERIFIED. |
| SF-18 | DONE (local code/tests) | Authenticated SignalR consumes telemetry/device events, retries reconnects, marks stale readings, and loads initial device states from `/api/devices`; 21/21 frontend tests, build and independent review PASS. Live SignalR/data remains NOT VERIFIED. |
| Hardware sensor check | USER-REPORTED STABLE; sensor interpretation PARTIAL | User reports physical hardware test runs stably and supplied serial samples. With the YL-69 immersed directly in water, ADC moved from 4095 through 2736–2885 to 1298–1459 (last four mean ≈1409); this is a water-immersion reference only, not a soil calibration point. DHT11 reads 22.7–23.1°C / 76.3–78.9% RH; float contact changes state. Float semantic mapping was inverted per user observation. Relay/pump test details and relay trigger polarity were not specified. |
| SQL readiness | BLOCKED by local environment | `/health/ready` returned 503 after SQL connection timeout; no migration was applied. |
| IoT hardware/MQTT | PARTIAL / LIVE E2E BLOCKED | User reports stable physical hardware. Backend unit test covers telemetry persist+broadcast; a production telemetry sketch now exists but is not compiled/flashed and no MQTT broker is configured. No device command was sent. |

## Next action

Next software step is compiling the ESP32 telemetry project, then configuring a disposable authenticated broker and SQL Server for simulated/device E2E. Command handling remains a separate firmware task and must implement documented edge safety before use. The web dashboard now loads stored summary data and can create/poll pump commands, but no hardware command was sent; browser UI verification is NOT VERIFIED because the in-app browser bridge is unavailable. Water-immersion ADC readings do not replace dry/saturated-soil calibration.

## Current integration task verification

| Check | Result | Evidence / limits |
|---|---|---|
| Frontend tests | PASS, 26/26 in 7 files | Includes summary/realtime behavior and mocked pump-command state polling; no real command endpoint called |
| Frontend production build | PASS | `npm.cmd run build` includes `tsc --noEmit` and Vite build |
| Backend unit suite | PASS, 147/147 | `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore` |
| Backend solution build | PASS | `dotnet build Smart_Farm_Mini.slnx --no-restore`, 0 warnings/errors |
| Backend MQTT handler focused tests | PASS, 3/3 | Verifies message persistence/broadcast and command ACK guards |
| ESP32 MQTT firmware | SOURCE PRESENT / NOT COMPILED | PlatformIO project, pinned dependencies, QoS 1 telemetry, TLS CA validation and ignored local config; toolchain unavailable |
| Browser UI | NOT VERIFIED | Browser bridge unavailable; local HTTP socket check was blocked/timed out |
| SQL/MQTT/firmware E2E | BLOCKED | Local SQL Server and MQTT broker unavailable; telemetry source not compiled/flashed/configured |
| Physical command | NOT RUN | No relay or pump command was activated |

## Latest develop integration — 2026-11-22

- Merged `origin/develop` (`56a1937`) into `feature/iot-end-to-end-integration` after resolving backend CORS, frontend architecture, and firmware telemetry conflicts.
- Independent read-only verifier found and confirmed the dashboard's DHT label mismatch, obsolete frontend modules/tests from the previous SignalR architecture, and unsafe pump-state inference from command delivery. These were addressed; no physical command was issued.
- Backend unit tests: **147/147 PASS**. Frontend tests: **9/9 PASS** in the clean lockfile-based copy. Frontend typecheck and production build: **PASS**; Vite reports a non-blocking >500 kB main-chunk warning.
- HTTP smoke of the temporary build: `/login` returned **200**. Interactive browser test: **NOT VERIFIED**; Browser MCP reports Chrome disconnected and requests extension update to 2.0, while the requested port 9011 refused the connection.
- Firmware compile: **PASS** with isolated PlatformIO core; ESP32 image built (47,072 bytes RAM; 911,017 bytes flash). No upload occurred.
- Database scripts `03_AddGoogleAuth_v2_2.sql` and `04_SoftDelete_Devices_v2_3.sql` were not applied. Live SQL/MQTT/SignalR/hardware E2E remains unverified.
- Full evidence: `.ai/MQTT_FIRMWARE_INTEGRATION_REPORT.md`.
- Change control: local merge/commit only; no push.
