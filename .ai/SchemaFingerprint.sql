USE [$(DatabaseName)];
GO
SET NOCOUNT ON;

DECLARE @Parts TABLE (SortKey nvarchar(1000) NOT NULL, Signature nvarchar(max) NOT NULL);

INSERT @Parts
SELECT N'T|' + s.name + N'.' + t.name, CONCAT(N'T|', s.name, N'.', t.name)
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
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
LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
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
      AND EXISTS (SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id = k.object_id AND c.column_id = k.column_id
                  WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0 AND c.name = N'DeviceCode')
      AND (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id = i.object_id AND k.index_id = i.index_id AND k.key_ordinal > 0) = 1) = 1
    INSERT @Parts VALUES (N'I|dbo.Devices|DeviceCodeUnique', N'I|dbo.Devices|DeviceCodeUnique|UNIQUE|DeviceCode');

INSERT @Parts
SELECT N'F|' + OBJECT_SCHEMA_NAME(f.parent_object_id) + N'.' + OBJECT_NAME(f.parent_object_id) + N'.' + f.name,
       CONCAT(N'F|', OBJECT_SCHEMA_NAME(f.parent_object_id), N'.', OBJECT_NAME(f.parent_object_id), N'.', f.name,
              N'|', OBJECT_SCHEMA_NAME(f.referenced_object_id), N'.', OBJECT_NAME(f.referenced_object_id),
              N'|', f.delete_referential_action, N'|', f.update_referential_action, N'|', f.is_disabled, N'|', f.is_not_trusted, N'|', f.is_not_for_replication,
              N'|', cols.FkCols)
FROM sys.foreign_keys f
OUTER APPLY (
    SELECT STRING_AGG(CONVERT(nvarchar(max), CONCAT(pc.name, N'->', rc.name)), N',') WITHIN GROUP (ORDER BY fc.constraint_column_id) AS FkCols
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

DECLARE @Canonical nvarchar(max), @SchemaHash varchar(64);
SELECT @Canonical = STRING_AGG(CONVERT(nvarchar(max), Signature), NCHAR(10)) WITHIN GROUP (ORDER BY SortKey COLLATE Latin1_General_100_BIN2)
FROM @Parts;
SELECT @SchemaHash = CONVERT(varchar(64), HASHBYTES('SHA2_256', @Canonical), 2);

SELECT DB_NAME() AS DatabaseName, (SELECT COUNT(*) FROM @Parts) AS CatalogPartCount, @SchemaHash AS NormalizedSchemaFingerprint;
SELECT SortKey, Signature FROM @Parts ORDER BY SortKey COLLATE Latin1_General_100_BIN2;
