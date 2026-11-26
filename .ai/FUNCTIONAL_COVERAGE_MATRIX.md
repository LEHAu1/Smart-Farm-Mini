# Functional Coverage Audit

Date: 2026-11-23 (Asia/Saigon)
Branch: `feature/iot-end-to-end-integration`

Latest local integration continuation details: [LOCAL_INTEGRATION_TEST_REPORT.md](LOCAL_INTEGRATION_TEST_REPORT.md).

## Evidence and environment

- **Browser E2E:** Browser MCP connected to Chrome. Vite frontend from this repository ran at `http://127.0.0.1:5173`; API ran at `http://127.0.0.1:5205`. Browser reached public routes and verified route guards, empty-form validation, and the 404 page. No authorized login session was available.
- **API runtime:** API health `/health`, `/health/live`, and `/health/ready` returned 200. Swagger loaded. A read-only heartbeat query successfully selected `Devices.IsDeleted` and `Devices.DeletedAtUtc`; no migration or data write was performed.
- **Automated:** frontend `npm test` passed 28/28, independently repeated by QA; `npm run build` passed typecheck and Vite build. The previous audit's backend suite passed 155/155; the continuation rerun is separately marked BLOCKED below. Focused Device UI suite passed 7/7 and was independently re-tested by QA.
- **Protected API negatives:** 32 endpoints returned 401 without a bearer token. Four public auth negative probes returned their expected status (register 400, unknown login 401, unknown refresh 401, logout of unknown token 204).
- **Not performed in the previous audit:** no account/device creation, profile/password mutation, rule/alert resolution, command dispatch, database migration, MQTT publish/subscribe, firmware flash, or actuator operation. The current prompt authorizes use of the existing local DB; this continuation still gates test data writes on verification of its server/schema, backup, and pre-existing identifiers.

## Historical continuation audit (before current local-infrastructure authorization)

- **Branch/source:** continued on `feature/iot-end-to-end-integration`, using only `frontend/smartfarm-web` and `backend/SmartFarm.WebAPI` from this repository. No source edits were needed in this continuation.
- **Browser Agent:** Browser MCP on Chrome re-ran empty Register and Login submissions; required-field validation appeared and no API request was sent. `/devices` redirected to `/login?returnUrl=%2Fdevices`. An inline 1251×987 login screenshot was captured in the Browser MCP session; the tool did not return a local file path.
- **Auth issue:** Google Identity `/gsi/status` and `/gsi/button` requests returned HTTP 403. Console says the origin `http://127.0.0.1:5173` is not allowed for the configured client ID. Google sign-in remains FAIL for this origin; no account was created.
- **Database Agent:** found development config targeting `localhost` / `SmartFarmMiniDb`, with API User Secrets configured (secret values were not read). Prior SQL evidence says `__EFMigrationsHistory` is absent and migrations are pending. LocalDB connection could not be confirmed from the sandbox; no test DB was created and no migrations/data writes were run.
- **Device/MQTT Agent:** source review confirmed registration and telemetry handlers write to the configured DB, so simulator publishing there would violate the test isolation rule. No MQTT messages or commands were sent. ESP32 telemetry sketch has no command subscription/ACK implementation; this is an implementation gap against the documented command flow.
- **QA Verifier:** independently reran the focused Devices suite and confirmed 7/7 pass. The full frontend suite was rerun by the orchestrator at 28/28; `npm run build` and typecheck passed.
- **Backend regression attempt:** the prior audit recorded 155/155 xUnit tests passing. This continuation attempted the existing test assembly without rebuilding; VSTest found it but could not connect to `testhost.exe` within 90 seconds, so this attempt is **BLOCKED**, not a failed test assertion. A second no-restore invocation emitted no test-run evidence and is not counted as a pass. The user explicitly prohibited trying to bypass the sandbox; no elevation was requested.
- **Status at that historical checkpoint:** Register/Login with persistence; Add Device, owner binding and persistence; refresh/re-login persistence; MQTT telemetry→DB→SignalR/dashboard; command→simulated ACK; MQTT disconnect/recovery were BLOCKED because no disposable DB/test broker was available. The current prompt authorizes existing local infrastructure; this continuation instead remains gated on verifying the existing DB backup/schema/identifiers and broker/topic/device safety. Physical hardware/actuator verification remains NOT RUN.

## Local integration continuation (2026-11-23)

- **Browser MCP:** The Chrome skill bootstrap was unavailable to its worker in this session; the Orchestrator used the explicitly requested Browser MCP Extension directly. Frontend tab `http://127.0.0.1:5173` and API tab `http://127.0.0.1:5205` were reachable. `GET /health/ready` returned HTTP 200 with `database=Ready` and `mqttBroker=Connected`.
- **Safe browser checks:** empty Register and mismatched confirm-password submissions showed validation and produced no POST. One synthetic invalid login returned 401; source increments `AccessFailedCount` when a matching account exists, and the DB was unavailable to determine whether it matched, so that possible counter update is unverified. No further login attempts were made. Unauthenticated `GET /api/Auth/me` returned 401. Opening `/devices` redirected to `/login?returnUrl=%2Fdevices`. A 1251×987 login screenshot was captured inline by Browser MCP; no filesystem screenshot path was provided. No successful login or account creation occurred.
- **Database safety gate:** `appsettings.Development.json` contains `Server=localhost;Database=SmartFarmMiniDb;Trusted_Connection=True`; the API uses SQL Server. The API health check confirms some database is reachable, but its live server/database identity was not queried. SQLCMD failed with `Cannot generate SSPI context`, LocalDB instance discovery failed under the current sandbox, no backup validity or pre-existing account/device identifiers could be verified, and the current EF history/schema were not inspected. Prior SQL evidence (from earlier audit) showed missing `__EFMigrationsHistory` and pending migrations; this was not rechecked. No account/device records or migrations were written; one failed-login POST may have changed `AccessFailedCount` if its synthetic identifier matched an existing user, which could not be verified.
- **MQTT safety and configuration:** backend User Secrets contain non-secret settings `Enabled=true`, `Host=127.0.0.1`, `Port=1883`, `UseTls=false`; `/health/ready` currently reports its broker connection as Connected. The local Mosquitto config listens on `0.0.0.0:1883` with anonymous access disabled and a password-file plugin; its current client/subscriber list was not queried. No MQTT subscribe/publish was performed. Firmware telemetry config points to `192.168.88.240:1883`, which differs from the backend loopback target. Its local ignored `DeviceCode` value contains an extra character and trailing space and fails the firmware whitelist; this is not proof of the actual attached device ID. No secret values were copied into this report.
- **MQTT contract/source:** telemetry topic `smartfarm/device/{deviceCode}/telemetry`; ACK topic `smartfarm/device/{deviceCode}/ack`; command topic `smartfarm/device/{deviceCode}/command`. Backend subscribes to telemetry and ACK; telemetry handling persists readings and device state and signals updates; command publisher uses QoS 1. Current firmware sketch publishes telemetry only and has no command subscription/ACK path. No active retained-message directive or explicit retain flag was found in the inspected broker config/publishers; broker retain capability itself was not changed or probed.
- **Regression in this continuation:** frontend `npm test` passed 28/28; `npm run build` and typecheck passed (non-blocking ~598 kB chunk warning). Backend 155/155 remains the previous audit result; the current sandbox rerun could not connect VSTest to `testhost.exe` and is BLOCKED, not an assertion failure. No source code was changed in this continuation.
- **Seven requested flows:** (1) Register→Login→Dashboard positive: BLOCKED; validation and login-failure negatives PASS. (2) Login→Add Device→DB: BLOCKED. (3) Refresh→Load Device: BLOCKED. (4) Logout→Login→ownership persistence: BLOCKED. (5) MQTT telemetry→backend→dashboard: BLOCKED; no MQTT message observed/published. (6) command→simulated ACK: BLOCKED; no command sent and current firmware has no ACK path. (7) MQTT disconnect/recovery: NOT RUN; shared broker was not restarted.
- **Data/hardware:** zero account/device test records created; no cleanup required. One possible auth failed-login counter update cannot be ruled out. No backup created or verified. No physical hardware, firmware flash, or actuator interaction.

## Resume after connection-string update (2026-11-23)

- `appsettings.Development.json` and API User Secrets now both specify `(localdb)\MSSQLLocalDB` / `SmartFarmMiniDb` / Integrated Security. No connection-string environment override was found in the audit shell. The running API process's environment/arguments and active DB identity remain NOT VERIFIED.
- Browser MCP `GET /health/ready`: HTTP 200, database Ready and MQTT Connected. This verifies readiness only, not DB identity/schema/backup.
- Browser MCP: empty Login/Register submissions marked required fields invalid and sent no auth requests. Screenshot of registration validation captured inline. No positive auth or DB write.
- Backend restart: NOT RUN because sandbox could not identify the process owning the API; API startup can trigger heartbeat updates to existing device statuses. Existing health endpoint is responding.
- Database identity/schema/backup/migration/IDs: BLOCKED by LocalDB registry/SQLCMD access from sandbox. No migration or write. Read-only host SQLCMD is included in `.ai/LOCAL_INTEGRATION_TEST_REPORT.md`.
- Frontend regression rerun: PASS 28/28; build/typecheck PASS. Backend testhost status remains prior audit: 155/155 passed, latest attempted rerun blocked by testhost connection timeout.

Status meanings: **PASS** means the stated test was executed and met its expectation; **FAIL/GAP** means a verified requirement or source gap; **BLOCKED** means prerequisites were unavailable or a write/actuator test would affect shared state; **NOT VERIFIED** means source or test evidence does not establish runtime behavior; **N/A** means outside the route/function's behavior.

## Requirement inventory: SF-1 through SF-41

The requirement source is `.ai/REQUIREMENTS.md` (the repository has no separate SRS). This audit reviewed all 41 entries and records their test state here. “Source/auto” is code or automated-test evidence; it must not be read as live E2E.

| ID | Requirement | This audit's evidence/status |
|---|---|---|
| SF-1 | Repository setup and contribution workflow | Source/docs inspected; no setup workflow runtime test required. |
| SF-2 | Web API, Swagger, health checks | PASS: Swagger loaded; `/health`, `/health/live`, and `/health/ready` returned 200. |
| SF-3 | ERD, SQL schema, keys and migrations | PARTIAL: DB readiness works; screenshot evidence says `__EFMigrationsHistory` is absent and all listed migrations Pending. Do not apply EF update to this DB yet. |
| SF-4 | EF Core, repository/service and CRUD foundation | PASS for xUnit suite (155); live authenticated CRUD/persistence BLOCKED. |
| SF-5 | React TypeScript routes and API client | PASS: typecheck/build and frontend tests; protected feature-page rendering BLOCKED without auth. |
| SF-6 | Login validation, feedback and navigation | PASS: browser empty validation/no request; successful browser login BLOCKED. Earlier Swagger auth flow is user-reported, not repeated in this audit. |
| SF-7 | Password/JWT/protected APIs/roles | PASS: 32 unauthenticated API checks returned 401; authenticated positive/ownership flows NOT VERIFIED in this browser session. |
| SF-8 | Dashboard mock metrics/device state | Source/automated coverage exists; actual dashboard route BLOCKED behind auth. |
| SF-9 | CI and PR review process | Source inspected; hosted Actions checks NOT VERIFIED in this run. |
| SF-10 | Assemble ESP32 circuit and validate power | User-reported stable hardware; no independent hardware test in this audit. |
| SF-11 | Air sensor reading and error behavior | Source inspected; physical sensor accuracy NOT VERIFIED here. |
| SF-12 | Soil ADC calibration/filtering | NOT VERIFIED on hardware; earlier user readings show ADC responds, but no soil calibration test in this audit. |
| SF-13 | Float switch and disconnect/fail-safe | NOT VERIFIED on hardware in this audit. |
| SF-14 | Authenticated MQTT broker and topic/payload contract | Contract source inspected; live broker/ACL NOT VERIFIED. |
| SF-15 | ESP32 Wi-Fi/MQTT publish and reconnect | Firmware source inspected; no compile, flash, or current hardware test. |
| SF-16 | Backend MQTT subscriber/payload validation | PASS in unit-suite scope; live broker flow NOT VERIFIED. |
| SF-17 | Persist/query sensor readings | Live write/read BLOCKED; shared DB was not mutated. |
| SF-18 | SignalR dashboard updates/reconnect/offline UI | Source and automated tests exist; authenticated browser/realtime E2E NOT VERIFIED. |
| SF-19 | Safe relay and bounded pump operation | No actuator command sent; physical behavior NOT VERIFIED. |
| SF-20 | Independent fan/light control | No implementation/hardware found in repository source inventory; NOT IMPLEMENTED. |
| SF-21 | Authorized MQTT commands and ACK/timeout | Unit tests PASS in suite; live MQTT/device ACK NOT VERIFIED. |
| SF-22 | Pump controls, response, offline blocking | UI/API source and unit coverage exist; live command intentionally not sent; NOT VERIFIED. |
| SF-23 | Auto/manual mode and audit trail | Source/unit scope only; database/realtime E2E NOT VERIFIED. |
| SF-24 | Soil/water thresholds and device sync | Source/unit scope only; persistence/device sync NOT VERIFIED. |
| SF-25 | Automatic irrigation with hysteresis/stop rules | Physical firmware path not present in telemetry sketch; NOT IMPLEMENTED/VERIFIED. |
| SF-26 | Fail-safe for low water/sensor/network/runtime | No physical fault injection; NOT IMPLEMENTED/VERIFIED. |
| SF-27 | Alerts, realtime push and read state | Alerts route/API source exists; authenticated browser and persistence NOT VERIFIED. |
| SF-28 | Command actor/time/ACK history | Unit/source evidence only; DB-backed history NOT VERIFIED. |
| SF-29 | ESP32-CAM LAN stream/disconnect | No camera firmware/runtime test; NOT IMPLEMENTED. |
| SF-30 | React camera stream/offline state | No camera page/integration found; NOT IMPLEMENTED. |
| SF-31 | Image capture/storage/secure access | No capture API/storage verification; NOT IMPLEMENTED. |
| SF-32 | Image gallery/date filter/detail | No gallery/persistence verification; NOT IMPLEMENTED. |
| SF-33 | Sensor history charts/date/error states | Sensors/history source exists, but authenticated live data/empty/error states NOT VERIFIED. |
| SF-34 | Activity statistics from confirmed logs | No route/API for these statistics found in current route/endpoint inventory; NOT IMPLEMENTED. |
| SF-35 | Full login→telemetry→realtime→command→camera E2E | BLOCKED: no positive test login because DB identity/backup/data inventory gate is unmet; no telemetry was observed; camera target is unavailable. |
| SF-36 | Fault injection and edge fail-safe | BLOCKED: firmware/hardware fault rig not available and actuators were not operated. |
| SF-37 | Assembly/deployment/troubleshooting guide | Docs inspected; end-to-end deployment procedure NOT VERIFIED. |
| SF-38 | Final live model/site demo | No live video/demo captured; NOT VERIFIED. |
| SF-39 | Plant image AI analysis/history | Future backlog; NOT APPLICABLE to current implementation audit. |
| SF-40 | Plant/zone lifecycle management | Future backlog; NOT APPLICABLE to current implementation audit. |
| SF-41 | Timezone-aware scheduling | Future backlog; NOT APPLICABLE to current implementation audit. |
| API-PROFILE | Update display name/phone and change password using old-password verification | Backend/unit source coverage; live authenticated profile/password mutation BLOCKED. |
| AUTH-FE | Backend JWT authentication and protected frontend session | Login/register empty-form and guest-guard browser checks PASS; positive authenticated browser session BLOCKED. Frontend automated tests PASS. |

## Frontend route coverage

`App.tsx` defines the following 17 route entries. Browser results are actual navigation results; protected routes only prove the auth guard, not the contents or controls behind it.

| Route | Expected behavior | Positive/render test | Negative/guard test | Result |
|---|---|---|---|---|
| `/` | Redirect to dashboard | Redirect executed | Guest dashboard access redirected | PASS: final login URL contains `returnUrl=/dashboard`. |
| `/login` | Render login form | Form rendered | Empty submit highlights required email/password and sends no API request | PASS in Chrome. Credential success NOT VERIFIED. |
| `/register` | Render registration form | Form rendered | Empty submit highlights username/email/password/confirm and sends no registration request | PASS in Chrome. Successful register NOT VERIFIED. |
| `/dashboard` | Authenticated garden overview | BLOCKED behind auth | Guest redirect | PASS guard; page behavior BLOCKED. |
| `/devices` | Device list and add/edit/activate/delete | BLOCKED behind auth | Guest redirect | PASS guard; device functions BLOCKED in browser. |
| `/devices/:deviceId` | Device detail | BLOCKED; source renders `DeviceDetailPlaceholder` | Guest redirect | **GAP:** route is registered but its component is still a placeholder. |
| `/devices/:deviceId/sensors` | Device sensor detail | BLOCKED; source renders `DeviceDetailPlaceholder` | Guest redirect | **GAP:** route is registered but its component is still a placeholder. |
| `/devices/:deviceId/irrigation` | Device irrigation detail | BLOCKED; source renders `DeviceDetailPlaceholder` | Guest redirect | **GAP:** route is registered but its component is still a placeholder. |
| `/sensors` | Sensor overview/history | BLOCKED behind auth | Guest redirect | PASS guard; controls/data BLOCKED. |
| `/irrigation` | Irrigation controls/rules | BLOCKED behind auth | Guest redirect | PASS guard; no command/actuator action sent. |
| `/irrigation-history` | Irrigation log history | BLOCKED behind auth | Guest redirect | PASS guard; results BLOCKED. |
| `/history` | Alias to irrigation history | BLOCKED behind auth | Guest redirect happens before alias page | PASS guard; post-login alias NOT VERIFIED. |
| `/alerts` | Alert filters and resolution | BLOCKED behind auth | Guest redirect | PASS guard; alert resolution NOT executed. |
| `/commands` | Command query/dispatch | BLOCKED behind auth | Guest redirect | PASS guard; dispatch NOT executed. |
| `/profile` | Profile/password forms | BLOCKED behind auth | Guest redirect | PASS guard; mutations NOT executed. |
| `/settings` | Preferences | BLOCKED behind auth | Guest redirect | PASS guard; persistence NOT VERIFIED. |
| `*` (tested `/does-not-exist`) | 404 page | “Không tìm thấy trang” and home link rendered | N/A | PASS in Chrome. |

### UI controls inventoried

Browser-accessible controls on public routes: login email/password, password visibility toggle, login submit, Google sign-in button, register link; registration username/email/display name/password/confirm-password fields, two visibility toggles, create-account submit, login link. Required-field validation was executed for both forms; password visibility and successful submissions were not.

Source-inventoried protected controls (render/interactions NOT VERIFIED because no authorized browser account): AppLayout sidebar/menu, language/theme/notification/user/logout controls; Dashboard device navigation and pump controls; Devices add/detail/edit/activate/deactivate/delete, modal cancel/submit, and list Retry controls; Sensors device/type/time filters; Irrigation device selector, pump start/stop/E-stop, rule create/toggle/edit/delete; History device/mode/date filters/reset/pagination; Alerts severity/resolution/device filters/reset/resolve/pagination; Commands device/type/status filters, command details and dispatch form; Profile update-profile/change-password forms; Settings locale/theme/preference controls. Mutating or actuator controls were not submitted.

## Backend endpoint coverage

The API has 40 HTTP operations in the controllers plus the SignalR hub `/hubs/sensors`. For all authenticated operations below, the unauthenticated negative request returned 401. Their authenticated positive cases remain NOT VERIFIED here unless a separate note says otherwise. `BLOCKED` reflects the absent authorized positive test session and the unverified local DB backup/schema/data safety gate before writes; it is not a passing result.

| Endpoint | Expected positive behavior | Negative test / result | Positive result this audit |
|---|---|---|---|
| `POST /api/Auth/register` | Register and issue tokens | Empty `{}` → 400 PASS | BLOCKED (would create account). |
| `POST /api/Auth/login` | Valid credentials → token pair | One synthetic invalid identifier → 401 PASS; whether it matched an existing account and changed `AccessFailedCount` is NOT VERIFIED | BLOCKED (no authorized credentials). |
| `POST /api/Auth/google` | Valid Google ID token → token pair | NOT RUN (requires configured OAuth) | BLOCKED; browser showed Google origin 403. |
| `POST /api/Auth/refresh-token` | Rotate valid refresh token | Unknown token → 401 PASS | Prior Swagger outcome user-reported PASS; not repeated. |
| `POST /api/Auth/logout` | Revoke valid refresh token → 204 | Unknown refresh token → 204 PASS (no matching token to mutate) | Prior Swagger 204 user-reported; not repeated. |
| `GET /api/Auth/me` | Return current profile | No bearer → 401 PASS | BLOCKED. |
| `PUT /api/Auth/profile` | Update display name/phone | No bearer → 401 PASS | BLOCKED (write). |
| `POST /api/Auth/change-password` | Change password with old-password proof | No bearer → 401 PASS | BLOCKED (credential mutation). |
| `GET /api/Dashboard/summary` | Return dashboard summary | No bearer → 401 PASS | BLOCKED. |
| `GET /api/Dashboard/system-health` | Return MQTT/system status | No bearer → 401 PASS | BLOCKED. |
| `GET /api/Devices` | Return owner-scoped paginated devices | No bearer → 401 PASS | BLOCKED. |
| `GET /api/Devices/{id}` | Return owned device or 404/403 | No bearer → 401 PASS | BLOCKED. |
| `GET /api/Devices/{id}/connection` | Return connection status | No bearer → 401 PASS | BLOCKED. |
| `POST /api/Devices` | Create device and bind owner from JWT | No bearer → 401 PASS | BLOCKED; no device record created. |
| `PUT /api/Devices/{id}` | Update device details | No bearer → 401 PASS | BLOCKED (write). |
| `PUT /api/Devices/{id}/deactivate` | Deactivate owned device | No bearer → 401 PASS | BLOCKED (write). |
| `PUT /api/Devices/{id}/activate` | Reactivate owned device | No bearer → 401 PASS | BLOCKED (write). |
| `DELETE /api/Devices/{id}` | Soft-delete owned device | No bearer → 401 PASS | BLOCKED (write). |
| `GET /api/devices/{deviceId}/sensors/latest` | Latest device sensor values | No bearer → 401 PASS | BLOCKED. |
| `GET /api/devices/{deviceId}/sensors/history` | Filtered time series | No bearer → 401 PASS | BLOCKED. |
| `GET /api/devices/{deviceId}/sensors/aggregates` | Aggregated sensor series | No bearer → 401 PASS | BLOCKED. |
| `GET /api/devices/{deviceId}/irrigation-rules` | List owned-device rules | No bearer → 401 PASS | BLOCKED. |
| `POST /api/devices/{deviceId}/irrigation-rules` | Create validated rule | No bearer → 401 PASS | BLOCKED (write). |
| `PUT /api/irrigation-rules/{ruleId}` | Update rule | No bearer → 401 PASS | BLOCKED (write). |
| `PATCH /api/irrigation-rules/{ruleId}/toggle` | Enable/disable rule | No bearer → 401 PASS | BLOCKED (write). |
| `DELETE /api/irrigation-rules/{ruleId}` | Delete rule | No bearer → 401 PASS | BLOCKED (write). |
| `GET /api/devices/{deviceId}/irrigation/status` | Return pump/mode status | No bearer → 401 PASS | BLOCKED. |
| `GET /api/irrigation-logs` | Owner-scoped filtered logs | No bearer → 401 PASS | BLOCKED. |
| `GET /api/irrigation-logs/{logId}` | Return a log entry | No bearer → 401 PASS | BLOCKED. |
| `GET /api/alerts` | Filtered alert page | No bearer → 401 PASS | BLOCKED. |
| `GET /api/alerts/summary` | Alert counts by severity/resolution | No bearer → 401 PASS | BLOCKED. |
| `GET /api/alerts/{id}` | Return one alert | No bearer → 401 PASS | BLOCKED. |
| `PATCH /api/alerts/{id}/resolve` | Resolve an alert | No bearer → 401 PASS | BLOCKED (write). |
| `POST /api/devices/{deviceId}/commands` | Create and dispatch a command | No bearer → 401 PASS | BLOCKED; no command/actuator action sent. |
| `GET /api/devices/{deviceId}/commands` | Device command history | No bearer → 401 PASS | BLOCKED. |
| `GET /api/commands` | System owner-scoped command history | No bearer → 401 PASS | BLOCKED. |
| `GET /api/commands/{commandId}` | Return one command | No bearer → 401 PASS | BLOCKED. |
| `GET /health` | Overall liveness | HTTP 200 PASS | PASS. |
| `GET /health/live` | Process liveness | HTTP 200 PASS | PASS. |
| `GET /health/ready` | DB readiness | HTTP 200 PASS; DB query succeeded | PASS. |
| `GET /hubs/sensors` (SignalR negotiate/connect) | Authenticated hub handshake/events | NOT RUN in this browser session | BLOCKED. |

## Device registration traceability and cases

The documented registration fields come from `docs/frontend-api-mapping.md` and actual DTO/controller source. Registration uses `DeviceCode` (configured/printed in firmware), name, optional description, and authenticated account ownership. There is no QR, MAC, serial pairing code, or physical proof. A successful `POST /api/Devices` means a database record was created/associated; it does not prove a physical ESP32 paired, connected, or sent telemetry.

| Test | Expected | Actual/status | Evidence |
|---|---|---|---|
| Add form required fields empty | Visible errors; no API write | PASS in jsdom; browser Devices route blocked behind auth | `Devices.test.tsx`. |
| Device code whitespace-only | Visible error; no POST | PASS in jsdom; fix added during this audit | New regression test. |
| Device name whitespace-only | Visible error; no POST | PASS in jsdom; fix added during this audit | New regression test. |
| Valid synthetic request contract | POST `{deviceCode,name,description}`; success row appears | PASS in jsdom only; no live record created | New test validates payload and list display. |
| Device list GET failure | Show error rather than empty state; Retry reloads list | PASS in jsdom; live browser error/retry NOT VERIFIED | Independent QA confirmed failed GET → alert → successful retry displays device. |
| Duplicate code/API error | Show safe API error | PASS in jsdom; live duplicate status NOT VERIFIED | Device UI regression test. |
| Invalid device-code format | Block before API | PASS in jsdom; backend validator also covered by xUnit | Focused tests + full xUnit suite. |
| Empty/no identifier API request | Reject before persistence | Protected endpoint no-token test 401 PASS; authenticated validator path unit-tested | No DB write. |
| Ownership override for normal user | Ignore caller OwnerId; bind JWT user | PASS in backend unit suite; live cross-account test NOT VERIFIED | `SecurityRemediationTests`. |
| Duplicate identifier under concurrent requests | Stable friendly 400/409 | NOT VERIFIED; check-then-insert plus DB unique index exists | Requires disposable SQL concurrency test. |
| Persistence survives reload/logout/login | Same owner sees record | BLOCKED | No record created and no authorized browser account. |
| Pairing/telemetry after registration | Device online and readings visible | NOT VERIFIED | No pairing proof in API; broker/device delivery not exercised in this audit. |

## Test execution summary

| Command/check | Result |
|---|---|
| `npm test` | PASS: 8 files, 28 tests. |
| `npm run build` | PASS: typecheck + production build; Vite reports a non-blocking 597 kB JS chunk warning. |
| `npm test -- --run src/pages/Devices/Devices.test.tsx` | PASS: 1 file, 7 tests; independently repeated by QA verifier. |
| Backend unit suite in previous audit | PASS: 155/155 using isolated artifacts output. |
| Backend unit suite continuation rerun (`--no-build --no-restore`) | BLOCKED: VSTest found the existing assembly but could not connect to `testhost.exe` within 90 seconds; no test assertions completed. No sandbox elevation was requested. |
| Live unauthenticated protected API matrix | PASS: 32/32 returned 401; no account/device token used. |
| Live public auth negatives | PASS: 4/4 expected outcomes. |
| Live health and Swagger | PASS: health live/ready 200; Swagger loaded in Browser MCP. |
| Browser public routes/forms/guards/404 | PASS for executed interactions; protected content remains blocked without login. |
| DB migration/apply/write | NOT RUN; migration history discrepancy remains unresolved. |
| MQTT/device/actuator | NOT RUN; no publish/command/flash or hardware operation. |

## Remaining blockers and untested features

1. Verify the actual SQL Server/database identity, schema/migration history, backup, and pre-existing account/device identifiers before writing to the authorized local DB; then create a test account and test device with unique identifiers.
2. Need to implement the three device detail routes currently mapped to `DeviceDetailPlaceholder` if they are part of the intended user flow.
3. Confirm existing broker client/subscriber state and the correct firmware identity/topic safety. Then observe telemetry through the existing broker and verify DB/SignalR/dashboard; current broker health alone does not prove telemetry ingestion.
4. Command dispatch, pump start/stop, E-stop, automation and physical fail-safe were not triggered. This avoids unintended actuator operation; software tests alone do not verify hardware.
5. Google sign-in is blocked by the configured OAuth origin returning 403 for `127.0.0.1:5173`.
6. Migration history is absent and EF earlier listed migrations Pending; no migration was applied. Reconcile the existing SQL-managed schema before using `dotnet ef database update`.

Final Git state: six files are modified/untracked: the Device UI fix and tests, the three device-registration reports, and this coverage matrix. They are uncommitted and unpushed. The workspace was clean at audit start.

## Resume update — 2026-11-23

- Config-file target is `(localdb)\MSSQLLocalDB` / `SmartFarmMiniDb`; active API process target and actual DB identity remain **NOT VERIFIED**.
- Browser Agent's last successful `/health/ready` observation was HTTP 200 (`database=Ready`, `mqttBroker=Connected`), but that does not prove which database was loaded. A fresh Browser MCP call currently requires the user to click **Allow** in its extension popup.
- SQL schema, migration history, backup validity, and existing test identifiers are **BLOCKED** by sandbox LocalDB access. No migration or DB writes were performed.
- Positive Register/Login, Add Device persistence, and ownership E2E remain **BLOCKED** pending DB safety verification.
- Latest local frontend full suite: **PASS 28/28**; focused Login suite: **PASS 7/7**. QA had two earlier full runs at 27/28 due an intermittent assertion on the transient `Đang đăng nhập…` button (`Login.test.tsx:120`), so repeatability is still a low-severity test reliability concern.
- No code/config changes were made in this continuation; no commit/push.

## Host-level blocker recheck — 2026-11-23 (supersedes sandbox-only status)

| Area | Result | Evidence |
|---|---|---|
| Windows identity / LocalDB | PASS | `whoami` = `laptop-ukv16e8v\lenovo`, matches LocalDB owner; instance `MSSQLLocalDB` Running. |
| SQL reachability | PASS | SQLCMD connects to `LAPTOP-UKV16E8V\LOCALDB#20180816`; `SmartFarmMiniDb` ONLINE, 13 tables. Earlier failure was sandbox registry/process isolation. |
| Schema facts | PASS (read-only inspection) | Auth Google columns/index, device ownership FK and unique code index, sensor MessageId/index/check/FK confirmed. 3 existing users and 3 devices. |
| Backup | PASS | Existing `C:\Users\Lenovo\SmartFarmMiniDb.bak`; `RESTORE VERIFYONLY` says backup set valid. |
| EF history | BLOCKED / reconciliation required | `__EFMigrationsHistory` absent; `dotnet ef migrations list` marks all 3 source migrations Pending although the existing schema contains later migration objects. No migration applied. |
| Backend runtime config / health | NOT VERIFIED | Development config points to LocalDB/SmartFarmMiniDb; no secrets or shell env override found. No process listens on 5205, so active runtime overrides and `/health/ready` cannot be checked. Backend was not started because startup may mutate device heartbeat state and DB changes are forbidden. |
| VSTest timeout | PASS on host | Sandbox `dotnet test` failed at CLI startup due registry-denied `SecurityException`; host run passed 155/155 in ~11s and did not reproduce testhost timeout. |
| Positive Register/Login + Add Device DB E2E | NOT RUN / BLOCKED | The current request forbids DB changes; no account/device rows were added. |

No data, migration, source/config, MQTT, or hardware changes were made. The previous note that LocalDB schema/backup were blocked by sandbox access is superseded by the successful host-level read-only checks above.
