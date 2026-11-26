# Smart Farm Mini — Local Integration Test Report

Date: 2026-11-23 (Asia/Saigon)  
Branch: `feature/iot-end-to-end-integration`  
Source roots used: `frontend/smartfarm-web`, `backend/SmartFarm.WebAPI`

## Summary

This continuation used the existing local frontend, API, SQL Server configuration, and Mosquitto configuration. It did not create a second database/broker/container. The application readiness endpoint reported the database and broker connected. However, the required pre-write checks could not all be completed: direct SQL identity/schema/backup checks were blocked by the current sandbox. No account/device creation, migration, MQTT subscription/publication, command, firmware flash, or hardware interaction was performed. One negative login POST was sent; because auth increments `AccessFailedCount` when a matching account exists, that possible counter update could not be ruled out without DB access.

## Local infrastructure

| Component | Observed configuration/result | Status |
|---|---|---|
| Git | `feature/iot-end-to-end-integration` | PASS |
| Frontend | Repo `frontend/smartfarm-web`; script `npm run dev` (`vite --host 127.0.0.1`); Browser MCP reached `http://127.0.0.1:5173` | PASS |
| Backend | Repo `backend/SmartFarm.WebAPI`; launch profile Development, `http://localhost:5205`; Browser MCP reached API | PASS |
| API readiness | `GET /health/ready` → HTTP 200, `database=Ready`, `mqttBroker=Connected` | PASS (runtime readiness only) |
| SQL target in `appsettings.Development.json` | `(localdb)\MSSQLLocalDB` / `SmartFarmMiniDb`, Integrated Security; API is configured with SQL Server | CONFIGURATION OBSERVED; live identity NOT VERIFIED |
| SQL direct inspection | SQLCMD integrated authentication failed with `Cannot generate SSPI context`; LocalDB discovery could not access instance registry | BLOCKED |
| Backup | No backup artifact found in repository; backup history/location outside repo could not be verified | BLOCKED; no write allowed before this gate |
| EF schema/history | Earlier audit screenshots showed missing `__EFMigrationsHistory` and pending migrations; not rechecked in this continuation | NOT VERIFIED CURRENTLY; no migration run |
| Mosquitto | `D:\Program Files\Mosquitto\mosquitto.conf` has listener `0.0.0.0:1883`, anonymous access disabled, password-file plugin configured | CONFIGURATION OBSERVED |
| Backend MQTT | User Secrets non-secret options: enabled, `127.0.0.1:1883`, TLS disabled; API readiness reports Connected | PASS for backend broker connection only |
| Firmware MQTT | Local ignored config points to `192.168.88.240:1883`, different from backend target. DeviceCode has an extra character and trailing whitespace, rejected by firmware validation. Actual attached device identity not confirmed. | CONFIGURATION MISMATCH / NOT VERIFIED |
| Broker clients/retained state | No live subscriber/client list or retained messages queried. No active retain directive or explicit retain flag was found in inspected config/publishers. | NOT RUN |

Secret values were not copied into this report. The local firmware config contains credential literals; they are intentionally omitted here.

## Browser MCP results

Browser MCP Extension reached the existing Chrome tab and local application. The worker’s Chrome bootstrap path was unavailable, so the Orchestrator used the explicitly requested Browser MCP Extension directly.

| Test | Result | Evidence |
|---|---|---|
| Empty Register submit | PASS | Required fields marked invalid; no registration POST in Browser MCP requests. |
| Register with mismatched confirmation | PASS | Confirmation marked invalid; no registration POST. |
| Invalid synthetic Login | PASS (negative response); possible side effect unverified | `POST /api/Auth/login` returned 401. Auth source increments `AccessFailedCount` if the identifier matches an existing user; DB access was unavailable to verify whether a row matched. No further login attempts were made. |
| Unauthenticated `GET /api/Auth/me` | PASS (negative case) | Browser MCP request returned 401. |
| Guest opens `/devices` | PASS | Redirected to `/login?returnUrl=%2Fdevices`. |
| Google sign-in on localhost | FAIL | Google Identity requests returned 403; console said origin `http://127.0.0.1:5173` is not allowed for the configured client ID. |
| API readiness page | PASS | HTTP 200; response reported database Ready and MQTT Connected. |
| Screenshot | CAPTURED | Login page, 1251×987 JPEG returned inline by Browser MCP; tool did not provide a local path. |

No positive login/registration was executed and no token/session contents were read. The login screen was left with the fields cleared.

## Database safety and data changes

The current prompt authorizes non-destructive tests against the existing local DB, subject to safety checks. The appsettings file names `SmartFarmMiniDb`, and the API readiness check currently passes. Direct SQL connectivity was not available in this sandbox, so the actual SQL Server identity, current schema, migration history, backup validity, and existing account/device identifiers could not be confirmed. The earlier report’s migration-history evidence was not treated as a fresh inspection.

Before the first DB write, the prompt requires confirming those items and verifying or creating a backup. That gate was not met. No registration/device writes or cleanup were attempted.

| Data item | Result |
|---|---|
| Test accounts created | 0 |
| Test devices created | 0 |
| Account/device test records created | 0 |
| Possible auth counter update | One failed login may increment `AccessFailedCount` if the synthetic identifier matches an existing account; NOT VERIFIED |
| Existing IDs recorded | No; DB query was blocked |
| Backup created/verified | No; location/history could not be checked |
| Migrations applied | No |
| Cleanup performed | No cleanup was needed |

## Resume after SQL Server Name update (2026-11-23)

- **Effective configuration sources checked:** `appsettings.Development.json` and the API User Secrets `ConnectionStrings:DefaultConnection` both resolve, after sanitization, to `(localdb)\MSSQLLocalDB`, database `SmartFarmMiniDb`, Integrated Security. `Program.cs` uses `WebApplication.CreateBuilder(args)` and `GetConnectionString("DefaultConnection")`. The current audit shell has no `ConnectionStrings__DefaultConnection` environment override; launch profile selects `Development` and `http://localhost:5205`. Process-specific environment/command-line overrides for the already-running API could not be inspected, so its active target is **NOT VERIFIED**.
- **Backend health:** Browser MCP `GET http://127.0.0.1:5205/health/ready` returned HTTP 200 with `database=Ready` and `mqttBroker=Connected`. This confirms the API can reach some database and broker; it does not prove the running process used the newly updated LocalDB string or that its database is the named target.
- **Restart:** not performed. Sandbox process/port inspection did not expose the API process, so its ownership/path could not be confirmed before stopping it. Starting another instance could collide with the existing API and its MQTT client ID; API startup also runs a heartbeat service that may update stale existing device online status. The DB backup/schema gate remains incomplete.
- **Direct SQL check:** LocalDB registry discovery failed inside the sandbox; SQLCMD could not connect to `(localdb)\MSSQLLocalDB`. No schema, migration history, backup, or existing IDs were queried and no migration/write was run.
- **Current Browser checks:** empty Login and Register submissions showed required-field validation and produced no auth POST. Browser Agent captured an inline registration-validation screenshot. No credentials, session storage, or token values were inspected.
- **Current regression:** frontend `npm test` passed 28/28; `npm run build` and typecheck passed with the existing non-blocking ~598 kB chunk warning. No source code was changed in this resume pass.
- **Positive E2E remains BLOCKED:** no Register/Login with DB persistence, Add Device persistence/ownership, or data reload after refresh/logout was attempted until host-side SQL identity, schema, backup, and pre-existing IDs are verified.

### Read-only Windows host SQL verification

Run this in a Windows PowerShell session that can access the configured LocalDB. It only queries server/database identity, schema/foreign keys, migration history, table counts/IDs, and backup metadata; it does not apply migrations or modify data.

```powershell
$sql = @'
SET NOCOUNT ON;
SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY s.name, t.name;
SELECT fk.name, OBJECT_SCHEMA_NAME(fk.parent_object_id) AS ParentSchema,
       OBJECT_NAME(fk.parent_object_id) AS ParentTable,
       OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable
FROM sys.foreign_keys fk ORDER BY ParentTable, fk.name;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
    SELECT MigrationId, ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
ELSE SELECT N'__EFMigrationsHistory absent' AS MigrationStatus;
SELECT COUNT_BIG(*) AS UserCount FROM dbo.AspNetUsers;
SELECT COUNT_BIG(*) AS DeviceCount FROM dbo.Devices;
SELECT Id, DeviceCode FROM dbo.Devices ORDER BY DeviceCode;
SELECT TOP (5) bs.backup_finish_date, bs.type, bs.backup_size,
       bs.is_copy_only, bmf.physical_device_name
FROM msdb.dbo.backupset bs
JOIN msdb.dbo.backupmediafamily bmf ON bmf.media_set_id = bs.media_set_id
WHERE bs.database_name = DB_NAME() AND bs.type = 'D'
ORDER BY bs.backup_finish_date DESC;
'@
sqlcmd -S '(localdb)\MSSQLLocalDB' -d SmartFarmMiniDb -E -b -W -s '|' -Q $sql
```

If backup metadata returns a path, verify the actual backup file is accessible and, after reviewing the path, use read-only `RESTORE VERIFYONLY FROM DISK = N'<backup-path>'`. If LocalDB access or `msdb` permission fails, retain the error output and do not run migration or write operations.

## MQTT contract and test result

Source contract inspected:

- Telemetry: `smartfarm/device/{deviceCode}/telemetry`.
- Acknowledgement: `smartfarm/device/{deviceCode}/ack`.
- Command: `smartfarm/device/{deviceCode}/command`.
- Backend subscribes to telemetry and ACK topics at QoS 1. Telemetry handling resolves an active device, persists readings/device state, and emits realtime notifications. Command publishing is QoS 1.
- Current ESP32 telemetry sketch publishes telemetry but does not subscribe to commands or publish ACKs.

The backend reports an MQTT connection, but this is not proof of receiving a device message. No subscriber was started, no message was observed or published, and no command was dispatched. A simulator publish was held because the database write destination and backup gate were not verified, physical device identity could not be confirmed, and firmware/backend broker hosts differ. No broker restart or physical actuator operation occurred.

## E2E flow statuses

| Flow | Status | Reason |
|---|---|---|
| 1. Register → Login → Dashboard | BLOCKED | Only form validation and invalid-login negative checks ran; no account write without DB safety verification. |
| 2. Login → Add Device → Database | BLOCKED | No authorized successful login or device write; DB backup/schema/identity gate unmet. |
| 3. Refresh → Load Device | BLOCKED | No test device/session exists. |
| 4. Logout → Login → Verify ownership | BLOCKED | No authenticated test account/device. |
| 5. MQTT simulator → Broker → Backend → Dashboard | BLOCKED | No subscription/publication; test DB and physical topic isolation not established. |
| 6. Dashboard → Backend → MQTT command → Simulated Device → ACK | BLOCKED | No command sent; current firmware has no command/ACK path. |
| 7. MQTT disconnect → Offline → Recovery | NOT RUN | No broker restart or disconnect injection was performed. |

## Regression checks

| Check | Result |
|---|---|
| Frontend `npm test` | PASS: 8 files, 28 tests. |
| Frontend `npm run build` and typecheck | PASS; Vite emitted a non-blocking ~598 kB chunk warning. |
| Focused Device suite | PASS: 7/7 in the previous continuation, independently verified. |
| Backend unit tests | Previous audit PASS: 155/155. Current rerun BLOCKED: VSTest found the assembly but did not connect to `testhost.exe` within 90 seconds; no assertions completed. |
| `git diff --check` | PASS in prior continuation; no code was changed in this integration pass. |

## Files and code changes

- New: `.ai/LOCAL_INTEGRATION_TEST_REPORT.md`.
- Updated: `.ai/FUNCTIONAL_COVERAGE_MATRIX.md`.
- Preserved the existing user edit in `backend/SmartFarm.WebAPI/appsettings.Development.json` that changes the SQL Server name to `(localdb)\MSSQLLocalDB`; Orchestrator did not edit it.
- Frontend source/tests were not changed in this integration continuation. Earlier device-form validation and retry fixes remain in the working tree.
- No commit, push, merge, migration, broker change, or hardware operation was performed.

## Remaining actions

1. Verify the actual SQL instance/database through an authorized SQL client, inspect schema and migration history, and verify/create a backup before any test account/device write.
2. Confirm the correct firmware `DeviceCode` and MQTT host with the user/device setup before using the device identity.
3. After the DB safety gate, execute the positive registration/device persistence/ownership flows via Browser MCP and inspect resulting DB records.
4. Observe live telemetry without publishing first; only run a synthetic publisher after confirming the topic cannot reach a physical control path and that its identity is unused.
5. Test command/ACK against a simulated device only after DB/broker safety gates; keep physical actuators disconnected.
6. Correct the Google OAuth allowed origin in the provider configuration if Google sign-in is required on `127.0.0.1:5173`.

## Resume update — 2026-11-23

| Check | Latest result | Evidence / limitation |
|---|---|---|
| Current branch and working tree | PASS: branch remains `feature/iot-end-to-end-integration`; existing changes preserved. | `git status --short`; no source/config edits made by this continuation. |
| Configured target | PASS (configuration files only): Development `DefaultConnection` points to `(localdb)\MSSQLLocalDB` / `SmartFarmMiniDb`, Integrated Security. Prior config inspection found the same sanitized target in User Secrets and no shell environment override. | The active API process's loaded configuration and actual SQL identity remain NOT VERIFIED. |
| `/health/ready` | PASS in the Browser Agent's most recent successful observation: HTTP 200, DB Ready, MQTT Connected. | This does not identify the SQL instance/database. A fresh root Browser MCP attempt is currently blocked on the extension's `Allow` popup. No backend restart was done. |
| SQL schema / migration history / backup | BLOCKED. | LocalDB/SQLCMD was inaccessible from sandbox. No migration, backup operation, or DB write was performed. Use the read-only Windows-host SQL script above, then verify the backup path with `RESTORE VERIFYONLY` if available. |
| Register/Login and Add Device persistence | BLOCKED for positive DB E2E. | No new account/device was written. Existing browser checks covered only blank-form validation. |
| Frontend regression | PASS on latest full run: 8 files / 28 tests; focused Login suite: 7/7. | Independent QA reported two earlier full-suite runs at 27/28 because `Login.test.tsx:120` expected a transient loading button label. The latest full run passed; treat this assertion as potentially flaky until repeated runs are stable. |
| `git diff --check` | PASS. | Only line-ending conversion warnings. |

No source code, connection strings, database contents, broker state, or hardware were changed. The test DB safety gate remains closed until the Windows host confirms instance/database identity, schema/migration history, pre-existing IDs, and a verifiable backup.

## Host-level blocker recheck — 2026-11-23 (supersedes earlier sandbox-only results)

### Environment and SQL reachability

- `whoami` => `laptop-ukv16e8v\lenovo`.
- `Get-Command sqlcmd` and `Get-Command sqllocaldb` both resolved to installed Microsoft SQL tools.
- In the restricted sandbox, LocalDB failed while accessing its registry and `sqlcmd` timed out. Repeating the same read-only checks with approved host access succeeded. LocalDB reports owner `LAPTOP-UKV16E8V\Lenovo`, instance `MSSQLLocalDB`, state `Running`, version `17.0.4025.3`, pipe `LOCALDB#20180816`.
- SQL identity query returned `LAPTOP-UKV16E8V\LOCALDB#20180816`; `SmartFarmMiniDb` is `ONLINE`, with **13 tables**. This proves the earlier connection blocker was the Codex sandbox's registry/process isolation, not a Windows identity mismatch or a missing/misconfigured SQL instance.

### Read-only schema and migration history

- `SmartFarmMiniDb` currently has 3 users and 3 devices. `Devices.DeviceCode` has a unique index; `Devices.OwnerId` references `AspNetUsers`. Auth columns `GoogleSubjectId`, `AuthProvider`, `AvatarUrl` exist, as does the filtered unique Google subject index.
- `SensorReadings` has `MessageId`, the unique filtered `(MessageId, SensorType)` index, `CK_SensorReadings_ReceivedAfterRecorded`, and the `DeviceId` foreign key uses `NO_ACTION`. These correspond to the inspected compatibility migration operations.
- `dbo.__EFMigrationsHistory` is **absent**. Read-only `dotnet ef migrations list` successfully connected and reported all three source migrations as `Pending`: `20261105051702_InitialCreate_v2`, `20261113150000_SensorReadingCompatibilityFix`, and `20261122120000_AddGoogleAuthColumns`.
- This is a real schema/history inconsistency, not a reachability failure. The existing schema already contains objects added by later migrations, while the initial migration source creates tables that already exist. **Do not run `database update`** until migration history is reconciled against this database; no migration was run.

### Backup

- Existing full backup: `C:\Users\Lenovo\SmartFarmMiniDb.bak`, metadata finish time `2026-11-23 11:21:39`.
- Read-only `RESTORE VERIFYONLY` returned: `The backup set on file 1 is valid.` No backup was created or changed.

### Backend connection configuration and runtime

- `appsettings.json` has no `ConnectionStrings:DefaultConnection`; `appsettings.Development.json` specifies `(localdb)\MSSQLLocalDB`, `SmartFarmMiniDb`, integrated security.
- The project User Secrets file exists but has no `ConnectionStrings:DefaultConnection` key. `dotnet user-secrets list` itself fails to load this project under the installed CLI; values were not printed. The current shell has no connection-string environment override.
- Launch profile `http` selects `Development` and `http://localhost:5205`. Source uses `WebApplication.CreateBuilder(args)` and `GetConnectionString("DefaultConnection")`, then `UseSqlServer`.
- There is currently **no listener on port 5205**, so there is no active Backend process whose loaded overrides can be inspected, and `/health/ready` was not retested. The EF CLI did reach the configured LocalDB database during its migrations-list query. No API process was started because startup may write device heartbeat state and this request prohibits DB changes.

### VSTest timeout recheck

- In the sandbox, `dotnet test` stopped before test discovery with `System.Security.SecurityException: Requested registry access is not allowed` during .NET CLI telemetry initialization.
- The same test project run with approved host access completed successfully: **155/155 passed**, test run 11.0 seconds, no testhost timeout. Target is `net10.0`; .NET 10 runtime is installed alongside SDK 11.0.100.
- Thus the prior testhost timeout is no longer reproducible outside the sandbox. The confirmed environmental issue is sandbox registry/process access; the exact historical timeout trigger was not isolated further.

### Blocker status after this check

| Blocker | Status now | Notes |
|---|---|---|
| Codex sandbox cannot inspect LocalDB | RESOLVED for host diagnostics | Required approved host execution; LocalDB and SQLCMD work there. |
| Wrong Windows identity / unavailable SQL instance | CLEARED | Windows identity matches LocalDB owner; instance is Running. |
| Unknown database identity/schema/backup | CLEARED for read-only inspection | Correct DB ONLINE, 13 tables, schema facts inspected, backup verified. |
| EF migration history | STILL BLOCKED / NEEDS RECONCILIATION | History table absent; EF sees three migrations pending despite schema containing later-migration objects. No migration applied. |
| Active API target and `/health/ready` | NOT VERIFIED | Port 5205 has no listener; no active process to inspect. No start because it may change DB device status. |
| Register/Login and Add Device persistence E2E | NOT RUN / BLOCKED BY NO-DB-CHANGES CONSTRAINT | Would write account/device data; no records were created. |
| VSTest testhost timeout | CLEARED for current run | Host execution passed all 155 tests; sandbox CLI init remains restricted. |

No database rows, schema, migrations, MQTT messages, hardware, source files, or connection settings were changed by these checks.
