/*
    Prepared production EF Core history-adoption procedure for SmartFarmMiniDb.

    SAFETY:
    - Connect directly to SmartFarmMiniDb on the verified host's LocalDB instance.
    - @ApplyAdoption defaults to 0 (preflight only). Do not set it to 1 until a
      separate deployment approval has been granted.
    - Set @ApprovalReference only to the approval identifier recorded for that deployment.
    - This script never changes business tables or rows. It creates/populates only
      dbo.__EFMigrationsHistory after a complete normalized catalog/data preflight.
    - This procedure only adopts an already matching, history-free SQL lineage; it does
      not repair schema. Partial or unexpected history fails closed.
    - Rerunning after successful adoption is a verified no-op.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ApplyAdoption bit = 0;
DECLARE @ExpectedDatabaseName sysname = N'SmartFarmMiniDb';
DECLARE @ExpectedMachineName nvarchar(128) = N'LAPTOP-UKV16E8V';
DECLARE @ExpectedDataFile nvarchar(260) = N'C:\Users\Lenovo\SmartFarmMiniDb.mdf';
DECLARE @ExpectedLogFile nvarchar(260) = N'C:\Users\Lenovo\SmartFarmMiniDb_log.ldf';
DECLARE @ApprovalReference nvarchar(200) = N'';
DECLARE @ExpectedFingerprint varchar(64) = 'C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275';
DECLARE @ProductVersion nvarchar(32) = N'10.0.13';

DECLARE @ExpectedMigrations TABLE (MigrationId nvarchar(150) PRIMARY KEY);
INSERT @ExpectedMigrations (MigrationId) VALUES
    (N'20261105051702_InitialCreate_v2'),
    (N'20261113150000_SensorReadingCompatibilityFix'),
    (N'20261122120000_AddGoogleAuthColumns'),
    (N'20261124120256_CanonicalSchemaAlignment'),
    (N'20261124120435_IdentityKeyAndSoftDeleteIndex'),
    (N'20261124121439_RefreshTokenExpiryInvariant');

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;

BEGIN TRY
    IF DB_NAME() <> @ExpectedDatabaseName
        THROW 51199, 'Connected database does not match the approved target name.', 1;
    IF CONVERT(nvarchar(128), SERVERPROPERTY('MachineName')) <> @ExpectedMachineName
        THROW 51198, 'Connected SQL Server machine does not match the reviewed target host.', 1;
    IF CONVERT(int, SERVERPROPERTY('EngineEdition')) <> 4
       OR COALESCE(CONVERT(nvarchar(128), SERVERPROPERTY('InstanceName')), N'') NOT LIKE N'LOCALDB#%'
        THROW 51196, 'Connected SQL engine is not the expected SQL Server LocalDB instance.', 1;
    IF NOT EXISTS (SELECT 1 FROM sys.database_files WHERE file_id = 1 AND type = 0 AND physical_name = @ExpectedDataFile)
       OR NOT EXISTS (SELECT 1 FROM sys.database_files WHERE file_id = 2 AND type = 1 AND physical_name = @ExpectedLogFile)
        THROW 51195, 'Database MDF/LDF paths do not match the reviewed SmartFarmMiniDb files.', 1;
    IF @ApplyAdoption = 1 AND NULLIF(LTRIM(RTRIM(@ApprovalReference)), N'') IS NULL
        THROW 51197, 'A separate deployment approval reference is required before applying adoption.', 1;

    DECLARE @LockResult int;
    EXEC @LockResult = sys.sp_getapplock
        @Resource = N'SmartFarmMini_EFHistoryAdoption',
        @LockOwner = N'Transaction',
        @LockMode = N'Exclusive',
        @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51200, 'Could not acquire the migration-adoption lock.', 1;

    IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
       OR OBJECT_ID(N'dbo.Devices', N'U') IS NULL
       OR OBJECT_ID(N'dbo.SensorReadings', N'U') IS NULL
        THROW 51201, 'Target is missing core Smart Farm tables; refusing adoption.', 1;

    DECLARE @BusinessTableCount int;
    SELECT @BusinessTableCount = COUNT(*)
    FROM sys.tables
    WHERE is_ms_shipped = 0 AND name <> N'__EFMigrationsHistory';
    IF @BusinessTableCount <> 13
        THROW 51202, 'Target does not have the reviewed 13-table SQL lineage.', 1;

    DECLARE @HistoryExists bit = CASE WHEN OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL THEN 0 ELSE 1 END;
    DECLARE @AlreadyAdopted bit = 0;
    IF @HistoryExists = 1
    BEGIN
        IF (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory) <> (SELECT COUNT(*) FROM @ExpectedMigrations)
           OR EXISTS (SELECT MigrationId FROM @ExpectedMigrations EXCEPT SELECT MigrationId FROM dbo.__EFMigrationsHistory)
           OR EXISTS (SELECT MigrationId FROM dbo.__EFMigrationsHistory EXCEPT SELECT MigrationId FROM @ExpectedMigrations)
           OR EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE ProductVersion <> @ProductVersion)
            THROW 51203, 'Existing EF history is partial, unexpected, or from a different EF product version.', 1;

        SET @AlreadyAdopted = 1;
    END;

    /* Validate required model-level defaults. Extra legacy defaults are allowed. */
    DECLARE @RequiredDefaults TABLE (TableName sysname, ColumnName sysname, Expected nvarchar(100));
    INSERT @RequiredDefaults VALUES
        (N'Alerts', N'IsResolved', N'0'),
        (N'AspNetUsers', N'AuthProvider', N'n''local'''),
        (N'DeviceCommands', N'Status', N'1'),
        (N'Devices', N'IsActive', N'1'),
        (N'Devices', N'IsDeleted', N'0'),
        (N'Devices', N'IsOnline', N'0'),
        (N'IrrigationRules', N'IsEnabled', N'1');

    IF EXISTS (
        SELECT 1
        FROM @RequiredDefaults r
        LEFT JOIN sys.tables t ON t.name = r.TableName AND SCHEMA_NAME(t.schema_id) = N'dbo'
        LEFT JOIN sys.columns c ON c.object_id = t.object_id AND c.name = r.ColumnName
        LEFT JOIN sys.default_constraints d ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
        CROSS APPLY (SELECT LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(d.definition, N''), N'(', N''), N')', N''), N' ', N''), N'convert[bit],', N'')) AS NormalizedDefinition) n
        WHERE d.object_id IS NULL OR n.NormalizedDefinition <> r.Expected
    )
        THROW 51204, 'A model-required default is absent or has an unexpected value.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Devices GROUP BY DeviceCode HAVING COUNT_BIG(*) > 1)
        THROW 51205, 'Duplicate DeviceCode values prevent safe adoption.', 1;
    IF EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE GoogleSubjectId IS NOT NULL GROUP BY GoogleSubjectId HAVING COUNT_BIG(*) > 1)
        THROW 51206, 'Duplicate GoogleSubjectId values prevent safe adoption.', 1;
    IF EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE AuthProvider IS NULL)
        THROW 51207, 'Null AuthProvider values prevent safe adoption.', 1;
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE is_disabled = 1 OR is_not_trusted = 1)
       OR EXISTS (SELECT 1 FROM sys.check_constraints WHERE is_disabled = 1 OR is_not_trusted = 1)
        THROW 51208, 'Disabled or untrusted constraints prevent safe adoption.', 1;

    DECLARE @ConstraintViolations TABLE
    (
        TableName nvarchar(128),
        ConstraintName nvarchar(128),
        WhereClause nvarchar(max)
    );
    INSERT @ConstraintViolations EXEC (N'DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS');
    IF EXISTS (SELECT 1 FROM @ConstraintViolations)
        THROW 51209, 'DBCC CHECKCONSTRAINTS found existing data violations.', 1;

    /*
       Normalized catalog fingerprint. Only documented semantic-equivalence differences
       are normalized: DeviceCode unique constraint vs unique index, key direction for
       compatible index scans, optional legacy defaults, and INCLUDE columns on the
       soft-delete lookup index. All tables, columns, keys, filters, checks, FK actions,
       index key columns/order, uniqueness and enabled/trusted state remain fingerprinted.
    */
    DECLARE @Parts TABLE (SortKey nvarchar(1000) NOT NULL, Signature nvarchar(max) NOT NULL);

    INSERT @Parts
    SELECT N'T|' + s.name + N'.' + t.name, CONCAT(N'T|', s.name, N'.', t.name)
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0 AND t.name <> N'__EFMigrationsHistory';

    INSERT @Parts
    SELECT N'C|' + s.name + N'.' + t.name + N'.' + c.name,
           CONCAT(N'C|', s.name, N'.', t.name, N'.', c.name, N'|', ty.name, N'|', c.max_length,
                  N'|', c.precision, N'|', c.scale, N'|', c.is_nullable, N'|', COALESCE(c.collation_name, N''),
                  N'|', COLUMNPROPERTY(c.object_id, c.name, 'IsIdentity'), N'|',
                  COALESCE(CONVERT(nvarchar(100), ic.seed_value), N''), N'|',
                  COALESCE(CONVERT(nvarchar(100), ic.increment_value), N''), N'|',
                  c.is_computed, N'|', COALESCE(cc.definition, N''), N'|', c.generated_always_type,
                  N'|', c.is_hidden, N'|', c.is_rowguidcol, N'|', c.is_sparse)
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.columns c ON c.object_id = t.object_id
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
    WHERE t.is_ms_shipped = 0 AND t.name <> N'__EFMigrationsHistory';

    INSERT @Parts
    SELECT N'I|' + s.name + N'.' + t.name + N'|' + i.name,
           CONCAT(N'I|', s.name, N'.', t.name, N'|', i.name, N'|', i.type_desc, N'|', i.is_unique,
                  N'|', i.is_primary_key, N'|', i.is_unique_constraint, N'|', i.has_filter, N'|',
                  i.is_disabled, N'|', i.is_hypothetical, N'|', i.ignore_dup_key, N'|', COALESCE(i.filter_definition, N''),
                  N'|', COALESCE(x.IndexColumns, N''))
    FROM sys.indexes i
    JOIN sys.tables t ON t.object_id = i.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    OUTER APPLY (
        SELECT STRING_AGG(CONVERT(nvarchar(max), CONCAT(c.name, N':', ic.key_ordinal, N':', ic.is_included_column)), N',')
               WITHIN GROUP (ORDER BY ic.index_column_id) AS IndexColumns
        FROM sys.index_columns ic
        JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
          AND NOT (t.name = N'Devices' AND i.name = N'IX_Devices_IsDeleted' AND ic.is_included_column = 1)
    ) x
    WHERE t.is_ms_shipped = 0 AND t.name <> N'__EFMigrationsHistory' AND i.index_id > 0 AND i.name IS NOT NULL
      AND NOT (t.name = N'Devices' AND i.is_unique = 1 AND i.has_filter = 0
               AND EXISTS (SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id = k.object_id AND c.column_id = k.column_id
                           WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0 AND c.name = N'DeviceCode')
               AND (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1);

    IF (SELECT COUNT(*) FROM sys.indexes i
        WHERE i.object_id = OBJECT_ID(N'dbo.Devices') AND i.is_unique = 1 AND i.has_filter = 0
          AND i.is_disabled = 0 AND i.is_hypothetical = 0
          AND EXISTS (SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id = k.object_id AND c.column_id = k.column_id
                      WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0 AND c.name = N'DeviceCode')
          AND (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1) <> 1
        THROW 51210, 'Target must have exactly one unfiltered unique DeviceCode key.', 1;

    IF EXISTS (
        SELECT 1 FROM sys.indexes i
        WHERE i.object_id = OBJECT_ID(N'dbo.Devices') AND i.is_unique = 1 AND i.has_filter = 0
          AND (i.is_disabled = 1 OR i.is_hypothetical = 1)
          AND EXISTS (SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id = k.object_id AND c.column_id = k.column_id
                      WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0 AND c.name = N'DeviceCode')
          AND (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1)
        THROW 51215, 'Disabled or hypothetical DeviceCode uniqueness objects make adoption ambiguous.', 1;

    INSERT @Parts
    VALUES (N'I|dbo.Devices|DeviceCodeUnique', N'I|dbo.Devices|DeviceCodeUnique|UNIQUE|DeviceCode');

    INSERT @Parts
    SELECT N'F|' + OBJECT_SCHEMA_NAME(f.parent_object_id) + N'.' + OBJECT_NAME(f.parent_object_id) + N'.' + f.name,
           CONCAT(N'F|', OBJECT_SCHEMA_NAME(f.parent_object_id), N'.', OBJECT_NAME(f.parent_object_id), N'.', f.name,
                  N'|', OBJECT_SCHEMA_NAME(f.referenced_object_id), N'.', OBJECT_NAME(f.referenced_object_id),
                  N'|', f.delete_referential_action, N'|', f.update_referential_action, N'|', f.is_disabled, N'|', f.is_not_trusted, N'|', f.is_not_for_replication,
                  N'|', cols.FkCols)
    FROM sys.foreign_keys f
    OUTER APPLY (
        SELECT STRING_AGG(CONVERT(nvarchar(max), CONCAT(pc.name, N'->', rc.name)), N',')
               WITHIN GROUP (ORDER BY fc.constraint_column_id) AS FkCols
        FROM sys.foreign_key_columns fc
        JOIN sys.columns pc ON pc.object_id = fc.parent_object_id AND pc.column_id = fc.parent_column_id
        JOIN sys.columns rc ON rc.object_id = fc.referenced_object_id AND rc.column_id = fc.referenced_column_id
        WHERE fc.constraint_object_id = f.object_id
    ) cols
    WHERE OBJECT_NAME(f.parent_object_id) <> N'__EFMigrationsHistory';

    INSERT @Parts
    SELECT N'K|' + OBJECT_SCHEMA_NAME(parent_object_id) + N'.' + OBJECT_NAME(parent_object_id) + N'.' + name,
           CONCAT(N'K|', OBJECT_SCHEMA_NAME(parent_object_id), N'.', OBJECT_NAME(parent_object_id), N'.', name,
                  N'|', definition, N'|', is_disabled, N'|', is_not_trusted)
    FROM sys.check_constraints;

    DECLARE @Canonical nvarchar(max), @ActualFingerprint varchar(64);
    SELECT @Canonical = STRING_AGG(CONVERT(nvarchar(max), Signature), NCHAR(10)) WITHIN GROUP (ORDER BY SortKey COLLATE Latin1_General_100_BIN2)
    FROM @Parts;
    SELECT @ActualFingerprint = CONVERT(varchar(64), HASHBYTES('SHA2_256', @Canonical), 2);
    IF @ActualFingerprint <> @ExpectedFingerprint
        THROW 51211, 'Target catalog differs from the reviewed normalized clean-bootstrap schema.', 1;

    DECLARE @Counts TABLE (TableName sysname PRIMARY KEY, RowsCount bigint NOT NULL);
    INSERT @Counts
    SELECT t.name, SUM(p.rows)
    FROM sys.tables t
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    WHERE t.name IN (N'AspNetUsers', N'Devices', N'SensorReadings', N'DeviceCommands', N'RefreshTokens')
    GROUP BY t.name;

    IF @ApplyAdoption = 1
    BEGIN
        IF @AlreadyAdopted = 0
        BEGIN
            CREATE TABLE dbo.__EFMigrationsHistory
            (
                MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
                ProductVersion nvarchar(32) NOT NULL
            );

            INSERT dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
            SELECT MigrationId, @ProductVersion FROM @ExpectedMigrations;
        END;

        IF (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory) <> (SELECT COUNT(*) FROM @ExpectedMigrations)
            THROW 51212, 'Migration history did not reach the expected complete set.', 1;

        IF EXISTS (
            SELECT MigrationId FROM @ExpectedMigrations
            EXCEPT SELECT MigrationId FROM dbo.__EFMigrationsHistory
        )
            THROW 51213, 'One or more expected migration IDs are missing after adoption.', 1;

        IF EXISTS (
            SELECT MigrationId FROM dbo.__EFMigrationsHistory
            EXCEPT SELECT MigrationId FROM @ExpectedMigrations
        )
            THROW 51214, 'Unexpected migration IDs exist after adoption.', 1;

        COMMIT TRANSACTION;
        SELECT DB_NAME() AS DatabaseName,
               CASE WHEN @AlreadyAdopted = 1 THEN N'ALREADY_ADOPTED_NO_CHANGES' ELSE N'ADOPTED' END AS Result,
               @ActualFingerprint AS NormalizedSchemaFingerprint,
               @ApprovalReference AS ApprovalReference;
        SELECT * FROM @Counts ORDER BY TableName;
        SELECT MigrationId, ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
    END
    ELSE
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT DB_NAME() AS DatabaseName,
               CASE WHEN @AlreadyAdopted = 1 THEN N'ALREADY_ADOPTED_NO_CHANGES' ELSE N'PREFLIGHT_PASS_NO_CHANGES' END AS Result,
               @ActualFingerprint AS NormalizedSchemaFingerprint;
        SELECT * FROM @Counts ORDER BY TableName;
        SELECT N'No schema or data changes made; set @ApplyAdoption=1 only under an approved deployment plan.' AS NextStep;
    END;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
