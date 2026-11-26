# Device Registration Test Report

Date: 2026-11-23 (Asia/Saigon)
Branch: `feature/iot-end-to-end-integration`

The complete route, UI-control, requirement, and API matrix is in [FUNCTIONAL_COVERAGE_MATRIX.md](FUNCTIONAL_COVERAGE_MATRIX.md).

Continuation results (2026-11-23): Browser MCP rechecked Register/Login validation, one invalid-login 401, unauthenticated `/api/Auth/me` 401, and the `/devices` guest guard. The auth source increments `AccessFailedCount` if a failed-login identifier matches an existing account; DB access was unavailable to determine whether the synthetic identifier matched, so this possible counter update is unverified and no further login attempt was made. Google sign-in returns 403 because `http://127.0.0.1:5173` is not allowed for the configured OAuth client. The current prompt authorizes use of the existing local `SmartFarmMiniDb`, but direct SQL inspection, backup verification, migration/schema inspection, and pre-existing ID inventory were blocked by sandbox SQL connectivity. No account/device records or migration were created. See [LOCAL_INTEGRATION_TEST_REPORT.md](LOCAL_INTEGRATION_TEST_REPORT.md) for the integration evidence and flow statuses.

Resume after connection-string update: Browser MCP again returned `/health/ready` HTTP 200 with DB Ready/MQTT Connected and confirmed blank Register/Login validation makes no POST. Both `appsettings.Development.json` and User Secrets now target `(localdb)\MSSQLLocalDB / SmartFarmMiniDb`, but the running process target is not confirmed. SQL/backup/schema checks remain blocked by the sandbox; Backend was not restarted because the process could not be identified safely and startup can update existing device heartbeat state. No device/auth positive E2E was run.

## Workflow found

Device registration uses `POST /api/Devices` with `deviceCode`, `name`, optional `description`. For regular users, `DevicesController` overwrites any submitted `ownerId` with the current JWT user. The service validates the code/name/description, rejects an existing code, and saves a device record. Firmware uses the same `DeviceCode` for MQTT client identity/topic. No pairing code, QR, MAC verification, or device proof exists. Therefore `201 Created` establishes a database record and owner association only; it does not establish physical pairing or telemetry.

## Tests and evidence

| ID | Case | Status | Evidence |
|---|---|---|---|
| DEV-UI-01 | Open Device Management in Chrome | BLOCKED | `/devices` correctly redirected to login. No authorized test browser session was available. |
| DEV-UI-02 | Open Add Device modal and submit through real UI | BLOCKED | Requires authenticated browser session; no account/device was created for this audit. |
| DEV-UI-03 | Empty required device fields | PASS (automated) | UI shows validation feedback and does not call API. |
| DEV-UI-04 | Whitespace-only device code/name | PASS (automated; fix independently verified) | Both show validation error and do not call API. |
| DEV-UI-05 | Valid form request and success list row | PASS (jsdom only) | Test verifies exact API payload and inserted device row. No real record created. |
| DEV-UI-06 | Device list GET fails and user retries | PASS (jsdom only; fix independently verified) | Error is shown instead of empty state; retry refetches and renders the returned device. |
| DEV-API-01 | Unauthenticated `POST /api/Devices` | PASS | Live local API returned 401. |
| DEV-API-02 | Owner binding and service validation | PASS (automated) | Backend xUnit suite passed 155/155, including existing service/security coverage. |
| DEV-API-03 | Live authenticated create and persistence | BLOCKED | No authorized test account; local DB identity/schema/backup and pre-existing device IDs could not be verified before writes. No account/device record was created. |
| DEV-API-04 | Duplicate sequential/concurrent code behavior | PARTIAL | Service tests cover duplicate check; live SQL and concurrent unique-index race were not tested. |
| DEV-IOT-01 | Device online/telemetry after registration | NOT VERIFIED | No MQTT or physical device test this turn. Registration API itself does not pair a device. |
| DEV-IOT-02 | Pump/actuator behavior | NOT APPLICABLE to registration; NOT RUN | No command sent and no actuator activated. |

## Verified defect and fix

Two defects were fixed: the add form previously returned silently for whitespace-only required fields, and initial list API errors were swallowed as an empty list. The form now shows localized feedback without POST; list failures show an error and Retry control rather than the empty state. The full frontend suite passed 28/28; the focused Devices suite passed 7/7 and an independent verifier re-ran all 7 tests successfully.

Other implementation gaps and all explicitly untested functionality are listed in the linked coverage matrix. Browser UI tests for the authenticated Add Device flow remain blocked until a permitted test session is available.
