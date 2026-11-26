/*
    PREPARED ONLY — DO NOT EXECUTE WITHOUT A SEPARATE EXPLICIT APPROVAL.
    Scope: one device in SmartFarmMini_E2E_20261125_9C4A only.
    This is not an application migration and must never be pointed at SmartFarmMiniDb.

    Before the separately approved run:
      1. Register the target via POST /api/Auth/register.
      2. Verify /api/Auth/me and fill @TargetOwnerId and @ExpectedTargetEmail below.
      3. Stop the E2E backend/telemetry ingestion for the brief maintenance window.
      4. Re-run the read-only preflight and update expected values if anything changed.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ExpectedDatabase sysname = N'SmartFarmMini_E2E_20261125_9C4A';
DECLARE @ExpectedDeviceCode nvarchar(50) = N'FARM-ESP32-001';
DECLARE @ExpectedDeviceId uniqueidentifier = '6816241C-4666-4B2B-B2DE-DA23796B4CC1';
DECLARE @ExpectedOldOwnerId uniqueidentifier = '05A9A1F0-0133-43B7-837E-FB8CA0F6B82D';
DECLARE @ExpectedOldOwnerEmail nvarchar(256) = N'esp32-e2e-d8a1911bc57b464f811057731c600505@example.test';
DECLARE @ExpectedReadingCount bigint = 1860;

-- Deliberately NULL until the target account is created and separately approved.
DECLARE @TargetOwnerId uniqueidentifier = NULL;
DECLARE @ExpectedTargetEmail nvarchar(256) = NULL;

IF DB_NAME() <> @ExpectedDatabase
    THROW 51000, 'Wrong database. No reassignment was performed.', 1;

IF @TargetOwnerId IS NULL OR NULLIF(LTRIM(RTRIM(@ExpectedTargetEmail)), N'') IS NULL
    THROW 51001, 'Target account identity is not filled in. No reassignment was performed.', 1;

IF @TargetOwnerId = @ExpectedOldOwnerId
    THROW 51002, 'Target and current owner are identical. No reassignment was performed.', 1;

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @NowUtc datetimeoffset(7) = TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00');
    DECLARE @DeviceCount int;
    DECLARE @DeviceId uniqueidentifier;
    DECLARE @CurrentOwnerId uniqueidentifier;
    DECLARE @CurrentOwnerEmail nvarchar(256);
    DECLARE @IsActive bit;
    DECLARE @IsDeleted bit;
    DECLARE @BeforeReadingCount bigint;
    DECLARE @AfterReadingCount bigint;
    DECLARE @BeforeEvidence TABLE
    (
        EvidencePhase nvarchar(10), DeviceId uniqueidentifier, DeviceCode nvarchar(50),
        OwnerId uniqueidentifier, OwnerEmail nvarchar(256), IsActive bit, SensorReadingCount bigint
    );
    DECLARE @AfterEvidence TABLE
    (
        EvidencePhase nvarchar(10), DeviceId uniqueidentifier, DeviceCode nvarchar(50),
        OwnerId uniqueidentifier, OwnerEmail nvarchar(256), IsActive bit, SensorReadingCount bigint
    );

    SELECT @DeviceCount = COUNT(*)
    FROM dbo.Devices WITH (UPDLOCK, HOLDLOCK)
    WHERE DeviceCode = @ExpectedDeviceCode;

    IF @DeviceCount <> 1
        THROW 51003, 'DeviceCode is missing or duplicated. No reassignment was performed.', 1;

    SELECT
        @DeviceId = d.Id,
        @CurrentOwnerId = d.OwnerId,
        @CurrentOwnerEmail = u.Email,
        @IsActive = d.IsActive,
        @IsDeleted = d.IsDeleted
    FROM dbo.Devices AS d WITH (UPDLOCK, HOLDLOCK)
    LEFT JOIN dbo.AspNetUsers AS u WITH (HOLDLOCK) ON u.Id = d.OwnerId
    WHERE d.DeviceCode = @ExpectedDeviceCode;

    IF @DeviceId <> @ExpectedDeviceId
       OR @CurrentOwnerId <> @ExpectedOldOwnerId
       OR @CurrentOwnerEmail IS NULL
       OR LOWER(@CurrentOwnerEmail) <> LOWER(@ExpectedOldOwnerEmail)
       OR @IsActive <> 1
       OR @IsDeleted <> 0
        THROW 51004, 'Device identity, owner, or active state differs from preflight. No reassignment was performed.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.AspNetUsers WITH (UPDLOCK, HOLDLOCK)
        WHERE Id = @TargetOwnerId
          AND LOWER(Email) = LOWER(@ExpectedTargetEmail)
          AND EmailConfirmed = 1
          AND (LockoutEnd IS NULL OR LockoutEnd <= @NowUtc)
    )
        THROW 51005, 'Target account is missing, mismatched, unconfirmed, or locked out. No reassignment was performed.', 1;

    DECLARE @ReadingSnapshot TABLE
    (
        Id uniqueidentifier NOT NULL,
        DeviceId uniqueidentifier NOT NULL,
        SensorType tinyint NOT NULL,
        MessageId uniqueidentifier NULL,
        Value decimal(10,2) NOT NULL,
        Unit nvarchar(20) NOT NULL,
        RecordedAtUtc datetimeoffset(7) NOT NULL,
        ReceivedAtUtc datetimeoffset(7) NOT NULL,
        PRIMARY KEY (Id)
    );

    DECLARE @ExpectedSensorTypeCounts TABLE
    (
        SensorType tinyint NOT NULL PRIMARY KEY,
        ReadingCount bigint NOT NULL
    );
    INSERT INTO @ExpectedSensorTypeCounts (SensorType, ReadingCount)
    VALUES (2, 620), (3, 620), (5, 620);

    INSERT INTO @ReadingSnapshot
        (Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc)
    SELECT Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc
    FROM dbo.SensorReadings WITH (HOLDLOCK)
    WHERE DeviceId = @DeviceId;

    SELECT @BeforeReadingCount = COUNT_BIG(*) FROM @ReadingSnapshot;
    IF @BeforeReadingCount <> @ExpectedReadingCount
        THROW 51006, 'SensorReading count changed since preflight. Re-run preflight; no reassignment was performed.', 1;

    IF EXISTS (
        SELECT SensorType, COUNT_BIG(*) AS ReadingCount
        FROM @ReadingSnapshot
        GROUP BY SensorType
        EXCEPT
        SELECT SensorType, ReadingCount FROM @ExpectedSensorTypeCounts
    ) OR EXISTS (
        SELECT SensorType, ReadingCount FROM @ExpectedSensorTypeCounts
        EXCEPT
        SELECT SensorType, COUNT_BIG(*) AS ReadingCount
        FROM @ReadingSnapshot
        GROUP BY SensorType
    )
        THROW 51011, 'SensorReading per-type counts changed since preflight. Re-run preflight; no reassignment was performed.', 1;

    INSERT INTO @BeforeEvidence
        (EvidencePhase, DeviceId, DeviceCode, OwnerId, OwnerEmail, IsActive, SensorReadingCount)
    VALUES
        (N'BEFORE', @DeviceId, @ExpectedDeviceCode, @CurrentOwnerId, @CurrentOwnerEmail,
         @IsActive, @BeforeReadingCount);

    UPDATE dbo.Devices
       SET OwnerId = @TargetOwnerId,
           UpdatedAtUtc = @NowUtc
     WHERE Id = @ExpectedDeviceId
       AND DeviceCode = @ExpectedDeviceCode
       AND OwnerId = @ExpectedOldOwnerId
       AND IsActive = 1
       AND IsDeleted = 0;

    IF @@ROWCOUNT <> 1
        THROW 51007, 'Conditional ownership update affected other than one row. Transaction will roll back.', 1;

    SELECT @AfterReadingCount = COUNT_BIG(*)
    FROM dbo.SensorReadings WITH (HOLDLOCK)
    WHERE DeviceId = @DeviceId;

    IF @AfterReadingCount <> @BeforeReadingCount
        THROW 51008, 'SensorReading count changed during reassignment. Transaction will roll back.', 1;

    IF EXISTS (
        SELECT Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc
        FROM @ReadingSnapshot
        EXCEPT
        SELECT Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc
        FROM dbo.SensorReadings WITH (HOLDLOCK)
        WHERE DeviceId = @DeviceId
    ) OR EXISTS (
        SELECT Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc
        FROM dbo.SensorReadings WITH (HOLDLOCK)
        WHERE DeviceId = @DeviceId
        EXCEPT
        SELECT Id, DeviceId, SensorType, MessageId, Value, Unit, RecordedAtUtc, ReceivedAtUtc
        FROM @ReadingSnapshot
    )
        THROW 51009, 'SensorReading rows differ from the pre-update snapshot. Transaction will roll back.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Devices WITH (HOLDLOCK)
        WHERE Id = @ExpectedDeviceId
          AND DeviceCode = @ExpectedDeviceCode
          AND OwnerId = @TargetOwnerId
          AND IsActive = 1
          AND IsDeleted = 0
    )
        THROW 51010, 'Post-update device identity/owner check failed. Transaction will roll back.', 1;

    INSERT INTO @AfterEvidence
        (EvidencePhase, DeviceId, DeviceCode, OwnerId, OwnerEmail, IsActive, SensorReadingCount)
    SELECT N'AFTER', d.Id, d.DeviceCode, d.OwnerId, u.Email, d.IsActive, @AfterReadingCount
    FROM dbo.Devices AS d WITH (HOLDLOCK)
    JOIN dbo.AspNetUsers AS u WITH (HOLDLOCK) ON u.Id = d.OwnerId
    WHERE d.Id = @ExpectedDeviceId;

    COMMIT TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    SELECT * FROM @BeforeEvidence;
    SELECT * FROM @AfterEvidence;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    THROW;
END CATCH;
