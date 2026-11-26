# Smart Farm Mini — EF Core Migration Reconciliation

**Branch:** `feature/iot-end-to-end-integration`  
**Database:** `SmartFarmMiniDb` on `(localdb)\MSSQLLocalDB`  
**Scope:** Read-only reconciliation of the existing SQL schema, EF migration chain, current model and model snapshot. No database or source implementation changes were made.  
**Date:** 2026-11-23

## Executive summary

The blocker is not simply a missing `dbo.__EFMigrationsHistory` table. The repository contains two parallel schema histories:

1. Three EF Core migrations, all reported Pending because the EF history table is absent.
2. Manual SQL scripts `database/scripts/01_InitSchema.sql` through `04_SoftDelete_Devices_v2_3.sql`. The live DB matches substantial effects of these scripts, including all 13 tables, strict constraints, MQTT `MessageId`, Google-auth columns, and device soft-delete fields.

The first EF migration is **CONFLICTING** with the live DB: its `Up` creates tables that already exist, and some expected column lengths, FK delete actions and index names differ. The sensor and Google-auth migrations are **FULLY_PRESENT at the schema-effect level**, but are still unrecorded. Replaying the sensor migration would fail at its unguarded `AddColumn(MessageId)`.

The latest `SmartFarmDbContextModelSnapshot` is also stale relative to both the current model and DB. `dotnet ef migrations has-pending-model-changes` reports model drift. In particular, current `DeviceConfiguration` maps soft-delete fields and a query filter, but the snapshot does not include them.

**Do not run `dotnet ef database update` or manually stamp migration history.** First decide which schema lineage is canonical and design/test a baseline reconciliation plan.

## 1. Inspection method and safety

- Three workers inspected migration source, SQL catalog metadata, and schema reconciliation; an independent QA worker rechecked classifications, replay hazards and counts.
- Database inspection used `SELECT` catalog/data-count queries and `RESTORE VERIFYONLY` only. `dotnet ef migrations list` and `dotnet ef migrations has-pending-model-changes` were run; no migration was applied.
- No database record, table, index, constraint, setting, or connection string was changed by these agents.
- A separate telemetry writer appears to have remained active: exact `SensorReadings` count was 5,091 in one snapshot and 5,094 in independent QA's later snapshot. The audit did not write these rows; the total record count across the entire DB therefore cannot be certified unchanged. User, device, command and refresh-token counts remained 3, 3, 5 and 26 in both exact snapshots.

## 2. Database identity and migration-history findings

| Check | Read-only result |
|---|---|
| Windows identity | `LAPTOP-UKV16E8V\\Lenovo`, same as LocalDB owner |
| SQL Server instance | `LAPTOP-UKV16E8V\\LOCALDB#20180816`, LocalDB 17.0.4025.3, Running |
| Database | `SmartFarmMiniDb`, ONLINE, 13 user tables |
| Migration history | `OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U')` is `NULL`; table absent |
| EF migration list | `20261105051702_InitialCreate_v2`, `20261113150000_SensorReadingCompatibilityFix`, `20261122120000_AddGoogleAuthColumns` all Pending |
| History configuration | No custom `MigrationsHistoryTable` configuration found; EF default history table applies |
| Automatic migration | No `Database.Migrate()` / `EnsureCreated()` call found in WebAPI/Infrastructure startup path |
| Model/snapshot check | `dotnet ef migrations has-pending-model-changes` says changes exist since the latest migration |
| Existing backup | `C:\Users\Lenovo\SmartFarmMiniDb.bak`; `RESTORE VERIFYONLY` returned “The backup set on file 1 is valid.” |

The EF tools connected to this LocalDB during migration listing. The active WebAPI itself was not running on port 5205 during this reconciliation, so no claim is made about runtime health or runtime-loaded configuration.

## 3. Existing database schema inventory

All 13 tables are in `dbo`. Column lengths below are character lengths for `nvarchar(n)` (SQL Server catalog `max_length` is bytes). `NN` means NOT NULL; `NULL` means nullable. Unless stated, there is no column default.

| Table | Actual columns: SQL type, nullability, default |
|---|---|
| `Alerts` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `AlertCode nvarchar(50) NN`; `Title nvarchar(150) NN`; `Message nvarchar(1000) NN`; `Severity tinyint NN`; `IsResolved bit NN DEFAULT 0`; `CreatedAtUtc datetimeoffset(7) NN`; `ResolvedAtUtc datetimeoffset(7) NULL` |
| `AspNetUserClaims` | `Id int IDENTITY NN`; `UserId uniqueidentifier NN`; `ClaimType nvarchar(max) NULL`; `ClaimValue nvarchar(max) NULL` |
| `AspNetUserLogins` | `LoginProvider nvarchar(128) NN`; `ProviderKey nvarchar(128) NN`; `ProviderDisplayName nvarchar(max) NULL`; `UserId uniqueidentifier NN` |
| `AspNetUsers` | `Id uniqueidentifier NN DEFAULT newid()`; `UserName`, `NormalizedUserName`, `Email`, `NormalizedEmail nvarchar(256) NULL`; `EmailConfirmed bit NN DEFAULT 0`; `PasswordHash`, `SecurityStamp`, `ConcurrencyStamp`, `PhoneNumber nvarchar(max) NULL`; `PhoneNumberConfirmed`, `TwoFactorEnabled bit NN DEFAULT 0`; `LockoutEnd datetimeoffset(7) NULL`; `LockoutEnabled bit NN DEFAULT 1`; `AccessFailedCount int NN DEFAULT 0`; `DisplayName nvarchar(100) NULL`; `CreatedAtUtc datetimeoffset(7) NN`; `GoogleSubjectId nvarchar(128) NULL`; `AuthProvider nvarchar(50) NULL DEFAULT N'Local'`; `AvatarUrl nvarchar(500) NULL` |
| `AspNetUserTokens` | `UserId uniqueidentifier NN`; `LoginProvider nvarchar(128) NN`; `Name nvarchar(128) NN`; `Value nvarchar(max) NULL` |
| `DeviceCommands` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `CommandCode`, `Action nvarchar(50) NN`; `Payload nvarchar(max) NULL`; `Status tinyint NN DEFAULT 1`; `CreatedAtUtc datetimeoffset(7) NN`; `AcknowledgedAtUtc`, `CompletedAtUtc datetimeoffset(7) NULL`; `ErrorMessage nvarchar(1000) NULL` |
| `Devices` | `Id uniqueidentifier NN DEFAULT newid()`; `OwnerId uniqueidentifier NN`; `DeviceCode nvarchar(50) NN`; `Name nvarchar(100) NN`; `Description nvarchar(500) NULL`; `IsOnline bit NN DEFAULT 0`; `IsActive bit NN DEFAULT 1`; `CreatedAtUtc`, `UpdatedAtUtc datetimeoffset(7) NN`; `LastSeenAtUtc datetimeoffset(7) NULL`; `IsDeleted bit NN DEFAULT 0`; `DeletedAtUtc datetimeoffset(7) NULL` |
| `IrrigationLogs` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `Mode`, `Status tinyint NN`; `SoilMoistureBefore`, `SoilMoistureAfter decimal(5,2) NULL`; `WaterAmountMl decimal(8,2) NULL`; `StartedAtUtc datetimeoffset(7) NN`; `CompletedAtUtc datetimeoffset(7) NULL`; `DurationSeconds int NULL`; `Note nvarchar(500) NULL` |
| `IrrigationRules` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `Name nvarchar(100) NN`; `MoistureThreshold`, `TargetMoisture decimal(5,2) NN`; `MinIntervalMinutes`, `MaxDurationSeconds int NN`; `IsEnabled bit NN DEFAULT 1`; `CreatedAtUtc`, `UpdatedAtUtc datetimeoffset(7) NN`; `LastTriggeredAtUtc datetimeoffset(7) NULL` |
| `RefreshTokens` | `Id uniqueidentifier NN DEFAULT newid()`; `UserId uniqueidentifier NN`; `TokenHash nvarchar(88) NN`; `TokenFamily uniqueidentifier NN`; `ExpiresAtUtc`, `CreatedAtUtc datetimeoffset(7) NN`; `RevokedAtUtc datetimeoffset(7) NULL`; `ReplacedByTokenHash nvarchar(88) NULL`; `RevokeReason nvarchar(100) NULL` |
| `SensorReadingAggregates` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `SensorType tinyint NN`; `HourBucket datetimeoffset(7) NN`; `AvgValue`, `MinValue`, `MaxValue decimal(10,2) NN`; `SampleCount int NN`; `Unit nvarchar(20) NN`; `AggregatedAtUtc datetimeoffset(7) NN` |
| `SensorReadings` | `Id uniqueidentifier NN DEFAULT newid()`; `DeviceId uniqueidentifier NN`; `MessageId uniqueidentifier NULL`; `SensorType tinyint NN`; `Value decimal(10,2) NN`; `Unit nvarchar(20) NN`; `RecordedAtUtc`, `ReceivedAtUtc datetimeoffset(7) NN` |
| `SystemLogs` | `Id uniqueidentifier NN DEFAULT newid()`; `Level`, `Source tinyint NN`; `EventCode nvarchar(50) NN`; `Message nvarchar(max) NN`; `ExceptionDetails nvarchar(max) NULL`; `DeviceId uniqueidentifier NULL`; `CreatedAtUtc datetimeoffset(7) NN` |

### Keys, indexes and constraints found

- **Primary keys:** all 13 tables have a PK. Most are `Id`; `AspNetUserLogins` uses `(LoginProvider, ProviderKey)`; `AspNetUserTokens` uses `(UserId, LoginProvider, Name)`; `AspNetUserClaims.Id` is identity.
- **Unique constraints/indexes:** `UQ_Devices_DeviceCode` is a unique constraint; `UserNameIndex` is filtered unique on `NormalizedUserName`; `IX_AspNetUsers_GoogleSubjectId` is filtered unique; `IX_RefreshTokens_TokenHash` is unique; `IX_SensorAgg_Device_Type_Hour` is unique on `(DeviceId, SensorType, HourBucket)`; `IX_SensorReadings_MessageId_SensorType` is filtered unique on `(MessageId, SensorType)` where MessageId is non-null; `IX_IrrigLogs_OneRunningPerDevice` and `IX_IrrigRules_OneActivePerDevice` are filtered unique indexes.
- **Other indexes:** Alerts `(DeviceId, IsResolved, CreatedAtUtc)`; claims/login user indexes; AspNetUsers `EmailIndex`; commands `(DeviceId, Status)` and filtered `CreatedAtUtc` for Status 3/4; Devices `OwnerId` and filtered-access index `IX_Devices_IsDeleted` including `OwnerId, DeviceCode, Name, IsActive, IsOnline`; irrigation log `(DeviceId, StartedAtUtc)` and filtered Status index; rules `(DeviceId, IsEnabled)`; refresh expiry (filtered where not revoked), TokenFamily, UserId; aggregates listed above; sensor `(DeviceId, RecordedAtUtc)` and `(SensorType, RecordedAtUtc)`; system logs `(Level, CreatedAtUtc)` and filtered `(DeviceId, CreatedAtUtc)`.
- **Foreign keys:** `AspNetUserClaims`, `AspNetUserLogins`, `AspNetUserTokens` → `AspNetUsers` use CASCADE; `RefreshTokens` → `AspNetUsers` uses CASCADE; `Devices` → `AspNetUsers` uses NO_ACTION; `Alerts`, `DeviceCommands`, `IrrigationLogs`, `IrrigationRules`, `SensorReadingAggregates`, `SensorReadings` → `Devices` use NO_ACTION; `SystemLogs` → `Devices` uses SET_NULL. All inspected FKs were enabled.
- **Check constraints:** `CK_DevCmds_Status`; `CK_IrrigLogs_CompletedAfterStarted`, `CK_IrrigLogs_DurationNonNegative`, `CK_IrrigLogs_InProgressNoCompleted`; `CK_IrrigRules_MaxDuration`, `CK_IrrigRules_MinInterval`, `CK_IrrigRules_MoistureRange`, `CK_IrrigRules_TargetGtThreshold`; `CK_RefreshTokens_Expiry`; `CK_SensorAgg_SampleCount`, `CK_SensorAgg_SensorType`, `CK_SensorAgg_Values`; `CK_SensorReadings_ReceivedAfterRecorded`. All inspected checks were enabled.

## 4. EF migration operation inventory and comparison

### `20261105051702_InitialCreate_v2` — **CONFLICTING**

**Up operations:** creates all 13 tables listed above; defines their base columns/defaults; creates the initial primary keys, foreign keys and indexes. It expects `AspNetUserLogins.LoginProvider/ProviderKey` and `AspNetUserTokens.LoginProvider/Name` as `nvarchar(450)`. It creates a unique index named `IX_Devices_DeviceCode` rather than the live unique constraint `UQ_Devices_DeviceCode`. It has no `Devices.IsDeleted` / `DeletedAtUtc`, nor the `IX_Devices_IsDeleted` index.

**Differences from live DB:**

1. Every `CreateTable` targets a table that already exists, so running this migration against this DB conflicts immediately.
2. Identity provider/token key columns are live `nvarchar(128)`, not migration `nvarchar(450)`; the manual `01_InitSchema.sql` uses 128.
3. The unique DeviceCode rule exists with equivalent uniqueness intent but a different object type/name: live unique constraint `UQ_Devices_DeviceCode`, migration unique index `IX_Devices_DeviceCode`.
4. Current DB has soft-delete fields/default/index from SQL script 04; these are not in this migration or current ModelSnapshot.
5. Live domain FKs use NO_ACTION for history protection on Alerts, DeviceCommands, IrrigationLogs, IrrigationRules, aggregates and sensors. Initial migration uses CASCADE for those relationships; the EF sensor migration later changes only the sensor FK. Manual script 02 changes the broader FK set.
6. Live DB contains the check constraints listed above, many of which are not created by this EF migration; the manual initial SQL script includes strict checks.

**Down operations:** drops all 13 tables. This would destroy user, device, command, token and telemetry records. Never use this Down path on the existing DB.

### `20261113150000_SensorReadingCompatibilityFix` — **FULLY_PRESENT (schema effect)**

**Up operations:** adds nullable `SensorReadings.MessageId uniqueidentifier`; drops and recreates `FK_SensorReadings_Devices_DeviceId` with Restrict/NO_ACTION; adds unique filtered index `(MessageId, SensorType)` where MessageId is non-null; adds `CK_SensorReadings_ReceivedAfterRecorded` (`ReceivedAtUtc >= RecordedAtUtc`).

**Live DB:** all four effects are present with matching type/filter/check/delete action. However, the migration is Pending and `Up` adds `MessageId` unconditionally. Replaying it would conflict with the existing column. Its `Down` removes the index/check/MessageId data column and restores Cascade, risking data loss or behavior regression.

### `20261122120000_AddGoogleAuthColumns` — **FULLY_PRESENT (schema effect)**

**Up operations:** guarded additions of nullable `GoogleSubjectId nvarchar(128)`, `AuthProvider nvarchar(50)` with default `Local`, `AvatarUrl nvarchar(500)`; updates `AuthProvider` nulls to `Local`; creates filtered unique `IX_AspNetUsers_GoogleSubjectId`.

**Live DB:** all columns, sizes, default and index match. Exact query found zero rows with `AuthProvider IS NULL` and zero duplicate non-null Google subjects. Its Down is deliberately a no-op to preserve data. It is still unrecorded in EF history.

## 5. Manual SQL lineage and current ModelSnapshot

The repository has four manual scripts whose effects match live schema objects:

- `01_InitSchema.sql`: idempotent creation of the 13-table baseline, using 128-character Identity provider/token keys, `UQ_Devices_DeviceCode`, and strict constraints.
- `02_UpdateSchema_v2_1.sql`: MessageId idempotency, filtered index/checks, and multiple device-history FKs changed to NO_ACTION.
- `03_AddGoogleAuth_v2_2.sql`: Google auth columns/backfill/index; same live definitions as the EF Google migration.
- `04_SoftDelete_Devices_v2_3.sql`: `IsDeleted`, `DeletedAtUtc`, and `IX_Devices_IsDeleted` (including columns).

This is strong evidence of a parallel/manual SQL schema lineage; without a migration ledger, it is not proof of exactly which scripts ran or in what order.

`SmartFarmDbContextModelSnapshot.cs` includes the Sensor and Google-auth objects, but still expects Identity key columns as `nvarchar(450)` and the DeviceCode index name `IX_Devices_DeviceCode`. It does not include `IsDeleted`, `DeletedAtUtc`, or the global query filter present in `DeviceConfiguration.cs`. The EF model-drift command confirms the snapshot is behind the current model. A future migration generated before resolving this drift could propose duplicate soft-delete columns or otherwise encode the wrong baseline.

## 6. Safest reconciliation plan (proposal only)

1. **Freeze the source of truth:** choose whether the supported schema is the manual SQL script lineage or an EF-only migration lineage. Document the choice; do not mix “pending” labels with manual schema application.
2. **Reconcile model and snapshot on a disposable restored copy:** compare every table/column/default/key/index/FK/check in the current model and snapshot with the live DB. Fix the source model/snapshot/migration chain only after review. Do not use the existing DB as a migration-generation sandbox.
3. **Rehearse baseline adoption on an isolated restored copy:** verify backup restore, compute exact data counts, apply the proposed *reviewed* baseline/history procedure to that copy, then compare complete schema and run tests. The current initial migration must not be replayed.
4. **After explicit approval only:** schedule a quiescent maintenance window, stop all writers (API, MQTT ingestion and ESP32 telemetry), take and verify a fresh backup, verify target identity and counts, apply only the specifically approved reconciliation, then re-run schema checks, EF migration listing and application/unit tests. Resume writers only after verification.

No direct `INSERT` into `__EFMigrationsHistory` is recommended now. Schema equivalence is not sufficient to stamp migrations when the initial migration's operations differ from the live schema. If a baseline/history record is eventually chosen, it must be designed/reviewed and tested on a restored copy first.

## 7. Exact operations requiring explicit approval

- Creating a disposable restored database for rehearsal (if authorized) or changing the existing database.
- Creating `dbo.__EFMigrationsHistory` or inserting/stamping any migration IDs.
- Running any `dotnet ef database update`, SQL migration script, DDL, or schema repair.
- Adding/removing/altering tables, columns, defaults, indexes, constraints, keys or FK delete actions.
- Backfilling or updating any row; dropping data columns (especially `SensorReadings.MessageId`); restoring or replacing the live DB.
- Starting/restarting the WebAPI or MQTT consumers while telemetry is active if that can write device/reading state.

The approved backup is a verified recovery point, not permission to mutate the database. Any rollback plan must restore to a separately reviewed backup and account for telemetry/data written after its timestamp; no rollback or restore was attempted.

## 8. Risks and rollback

- Applying all Pending migrations naively will fail on existing tables/columns and may leave a partially reconciled database depending on transaction boundaries/tool behavior.
- Applying `InitialCreate_v2.Down` drops all 13 tables.
- Applying sensor migration Down drops MessageId and its index/check, and changes FK semantics back to Cascade.
- A manually stamped history table could make EF skip schema operations that were never actually performed; later migrations could then fail or application data behavior could silently differ.
- ModelSnapshot drift could generate duplicate column/index operations in a new migration.
- Live telemetry may continue writing SensorReadings while diagnostics run; quiesce all writers and establish fresh exact counts before any future change.

Rollback must not mean invoking the migration Down scripts. Prefer a tested restore to a fresh, separately named database from a freshly verified backup, validate it completely, and only then consider a controlled cutover with explicit approval.

## 9. Independent QA findings

| Claim | QA status | Evidence |
|---|---|---|
| Three migration classifications | PASS | Independent source/schema review: InitialCreate_v2 CONFLICTING; Sensor and Google-auth FULLY_PRESENT at schema-effect level. |
| Initial migration replay/Down risk | PASS | Existing 13 tables conflict with CreateTable; Down drops all 13. |
| Sensor replay risk | PASS | MessageId already exists; migration Up unconditionally adds it. |
| Google auth state | PASS | Expected columns/default/index present; 0 AuthProvider NULL and 0 duplicate non-null subjects. |
| Snapshot drift | PASS | Query filter/soft-delete fields in DeviceConfiguration absent from snapshot; `has-pending-model-changes` reports drift. |
| No writes by agents | PASS | All DB requests were SELECT/catalog reads or RESTORE VERIFYONLY; no migration/DDL/update issued. |
| All DB counts unchanged during audit | NOT VERIFIED | Exact SensorReadings counts changed 5,091 → 5,094 between snapshots, likely concurrent telemetry. Other tracked counts remained users=3, devices=3, commands=5, refresh tokens=26. |
| Backup validity | PASS | Existing backup passed `RESTORE VERIFYONLY`; no backup was created or altered. |

## 10. Smallest safe next action

**No DB operation is safe yet.** The smallest next action is to approve a separate, source-only reconciliation design that aligns the current model and snapshot with the chosen SQL lineage, then review that plan on a disposable backup restore. Approval is required before creating the test restore, changing schema/history, or running any migration against the existing `SmartFarmMiniDb`.
