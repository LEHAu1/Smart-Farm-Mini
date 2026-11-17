# Smart Farm Mini — Development Backlog

Baseline: `develop` (`772cfef`). Current work is on `feature/iot-end-to-end-integration`; changes carried over from the prior uncommitted workspace are being reviewed as part of this authorized branch. Requirements are linked to the GitHub issues in `REQUIREMENTS.md`; do not treat future ideas as MVP scope.

## Selected work

### SF-8 — Dashboard with mock data

- **Task ID:** SF-8
- **Source requirement:** [GitHub issue #8](https://github.com/LEHAu1/Smart-Farm-Mini/issues/8)
- **Description:** Replace the dashboard scaffold with a responsive view of the documented sensor values and device state, using clearly labeled local mock data.
- **Dependencies:** Existing React routes and design tokens; no backend, SQL, MQTT or hardware dependency.
- **Priority:** High (Sprint 1, per issue).
- **Assigned Agent:** Frontend Agent; independently reviewed by Verifier Agent.
- **Acceptance criteria:** Show sensor values and device status; adapt to mobile/desktop; visibly mark all values as demonstration/mock data; do not send real device commands; add focused UI tests.
- **Status:** DONE
- **Testing evidence:** `npm.cmd test` passed 7/7 (2 files); `npm.cmd run build` passed TypeScript and Vite; `git diff --check` passed; independent verifier passed all issue acceptance criteria.

### API-PROFILE-TESTS — Profile and password service coverage

- **Task ID:** API-PROFILE-TESTS
- **Source requirement:** Earlier user request in this conversation for `PUT /api/auth/profile` and `POST /api/auth/change-password`; implemented endpoints are in `AuthController`/`AuthService`.
- **Description:** Add focused unit tests for profile updates and ASP.NET Identity password-change result handling without changing production behavior.
- **Dependencies:** Existing xUnit/Moq backend test project; none external.
- **Priority:** High (authentication/profile security path and verified test gap).
- **Assigned Agent:** Backend Agent; independent verifier reviews the tests.
- **Acceptance criteria:** Tests reflect the exact current service behavior for profile success and password change success/failure; no undocumented validation behavior is introduced; backend test suite passes.
- **Status:** DONE
- **Testing evidence:** Full backend suite passed 147/147; the four new service tests independently passed 4/4; verifier confirmed assertions match service behavior.

### AUTH-FE — Replace demo login with the documented backend contract

- **Task ID:** AUTH-FE
- **Source requirement:** `frontend/smartfarm-web/README.md` API configuration/Login demo sections and `docs/testing/issue-6-login.md` update. The repo explicitly says the demo adapter remains and should be replaced by the backend auth contract.
- **Description:** Connect login to `POST /api/Auth/login`, establish a tab-scoped auth session, use it for authenticated API requests, protect private routes, and preserve clear errors/loading states.
- **Dependencies:** Existing backend login/profile/refresh contracts; Axios client and router. SQL Server is needed only for end-to-end runtime verification.
- **Priority:** High (authentication prerequisite for protected dashboard integrations such as SF-18).
- **Assigned Agent:** Frontend Agent; Verifier Agent reviews after implementation.
- **Acceptance criteria:** Send the documented login request; successful login opens the dashboard and retains a tab-scoped session; unauthenticated private routes go to login; 401/network/server errors remain visible and allow retry; logout clears local session; unit tests cover success/failure/route guard; no demo credential accepted as real auth.
- **Status:** DONE at local code/test scope
- **Testing evidence:** Frontend suite passed 15/15 at the AUTH-FE checkpoint; current full suite is 21/21 after SF-18. Production build and independent verifier passed. SQL-backed login remains NOT VERIFIED.

## Ready queue

| Task ID | Source requirement | Description | Dependencies | Priority | Assigned Agent | Acceptance criteria | Status | Testing evidence |
|---|---|---|---|---|---|---|---|---|
| SF-3 | GitHub #3 | Verify ERD/schema/migrations against a disposable SQL Server | SQL Server sandbox | High | Database Agent | ERD and schema cover documented entities/keys; migration applies and schema can be inspected; no production DB use | TODO | Files exist; database-backed migration not verified |
| SF-18 | GitHub #18 | Connect dashboard to SignalR and show reconnect/stale/offline states | SF-8; AUTH-FE; backend hub contract; SignalR client dependency | High | Integration Agent | UI consumes events, reconnects, marks stale/offline; automated tests cover event and reconnect behavior | DONE at local code/test scope | `@microsoft/signalr` client uses JWT, handles both backend events, reconnects and retries initial failure; `/api/devices` snapshot is normalized from `DeviceDto`; dashboard shows stale/offline states and labeled mock fallback. 21/21 frontend tests, build and verifier PASS. Live SQL-backed auth/SignalR remains NOT VERIFIED. |
| SF-17 | GitHub #17 | Verify sensor-reading persistence and time-filter API with SQL | SQL Server sandbox | High | Backend/Database Agents | Valid readings persist; invalid records rejected; time filters return expected records | TODO | Service tests only; DB unavailable locally |
| SF-15 | GitHub #15 | Implement ESP32 Wi-Fi/MQTT telemetry and reconnect | SF-11..13 sensor mapping; per-device MQTT credentials; broker | High | Firmware Agent | Publishes contract-compliant sensor telemetry; reconnects; broker integration test; no secret committed | PARTIAL (source added, not compiled) | PlatformIO sketch sends DHT11 and binary float WaterLevel over QoS 1, TLS CA required, config excluded from Git; YL-69 withheld until soil calibration; no PlatformIO/broker available to verify |
| SF-22 | GitHub #22 | Implement device-control UI and pending/result/offline states | SF-21 API contract; SF-18/device connection state | High | Frontend/Integration Agent | Buttons show loading/result; offline controls blocked; no physical actuator triggered during tests | PARTIAL (local UI/API contract) | Dashboard shows pump start/stop only for online ESP32/controller devices; polls command status; test suite mocks API. No ESP32 firmware command consumer or live MQTT broker is configured, so hardware command is not verified. |
| SF-14 | GitHub #14 | Validate authenticated MQTT topic contract on local broker | Disposable MQTT broker and per-device credentials/ACL | High | IoT/Integration Agents | Broker auth/ACL verified; telemetry/ACK/command topic contract exercised | BLOCKED | Configuration/docs and unit tests only; no broker available |
| SF-11..13 | GitHub #11–13 | Implement and test sensor firmware | User-reported wiring, ESP32 and diagrammed sensors; PlatformIO toolchain/bench readings needed | High | Firmware Agent | DHT22, calibrated soil values, float switch/disconnect behavior pass device tests | PARTIAL | User reports stable physical hardware and shared sensor samples. Telemetry firmware sends DHT11/float. Water immersion shows ADC response (last four samples mean ≈1409) but is not soil calibration. DHT11 differs from target DHT22; telemetry source not compiled/flashed here. |
| SF-19,25,26 | GitHub #19, #25, #26 | Implement and prove pump edge-safety behavior | Firmware, relay/driver, pump, safe test rig | High | Firmware/IoT Agent | Dry-tank, sensor-fault, network-loss, timeout and hysteresis checks stop/deny pump safely | BLOCKED | No physical system; software simulations are not hardware evidence |
| SF-27 | GitHub #27 | Complete frontend alert/realtime workflow | SF-18; alert API | High | Frontend/Integration Agents | Low-water/temperature/offline alerts display and update; read/resolve behavior is correct | TODO | Backend endpoints/tests exist; UI remains scaffold |
| SF-33 | GitHub #33 | Add sensor history charts and range/error states | History API; chart design | High | Frontend Agent | Soil/air/water metrics plot by date range and render empty/error states | TODO | History backend exists; chart UI absent |
| SF-35..36 | GitHub #35–36 | Run end-to-end and failure-mode verification | SQL, broker, firmware, camera, safe hardware rig | High | QA/Verifier Agent | Login→telemetry→realtime→command→ACK, camera and fail-safe scenarios recorded | BLOCKED | Frontend tests/build and backend unit tests pass; live SQL/MQTT/firmware/browser E2E cannot run in this environment. |
| SF-37..38 | GitHub #37–38 | Complete verified assembly documentation and final demo | Verified wiring/firmware and working model | Medium/High | Documentation/QA Agents | New contributor follows setup; live demo evidence exists | BLOCKED | README files exist; no verified model/video |

## Other documented work

The remaining issue-linked work is tracked in `.ai/REQUIREMENTS.md`. Sensor-only MQTT telemetry source now exists but is not compiled/flashed; pump-control firmware is still missing. SF-14, SF-20, SF-29 and physical portions of SF-35..38 still need broker/device/hardware work. SF-17/21/23/24/28 are implemented partially or at API/unit-test level and need integration/database evidence. SF-30/31/32/34 and future SF-39/40/41 have not been implemented. Do not mark any task DONE solely because its unit-level simulation passes.

### Hardware sensor check — diagnostic firmware only

- **Status:** Source added; compile/board verification NOT VERIFIED (Arduino CLI/PlatformIO not installed here).
- **File:** `firmware/esp32-controller/hardware-check/SmartFarmHardwareCheck.ino`
- **Scope:** Read YL-38 AO/GPIO34 raw ADC, DHT11/GPIO4 and float contact/GPIO27; deliberately leaves relay GPIO26 untouched and contains no pump command.
- **Safety boundary:** Keep the pump disconnected from relay contacts during first power/flash because relay trigger polarity is unconfirmed. Do not infer “water available” from the float contact until its installed orientation is measured.
