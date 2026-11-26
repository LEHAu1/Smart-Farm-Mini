SET NOCOUNT ON;
SELECT MigrationId, ProductVersion FROM SmartFarmMini_Phase2_20261125.dbo.__EFMigrationsHistory ORDER BY MigrationId;
SELECT c.name AS ColumnName, TYPE_NAME(c.user_type_id) AS SqlType, c.is_nullable, dc.definition AS DefaultDefinition
FROM SmartFarmMini_Phase2_20261125.sys.columns c
LEFT JOIN SmartFarmMini_Phase2_20261125.sys.default_constraints dc ON dc.object_id=c.default_object_id
WHERE c.object_id=OBJECT_ID(N'SmartFarmMini_Phase2_20261125.dbo.DeviceCommands') AND c.name IN (N'ExpiresAtUtc',N'DispatchAttemptCount',N'DispatchLeaseOwnerId',N'DispatchLeaseUntilUtc') ORDER BY c.name;
SELECT i.name AS IndexName, i.is_unique, i.type_desc, i.has_filter, STRING_AGG(col.name, N',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
FROM SmartFarmMini_Phase2_20261125.sys.indexes i
JOIN SmartFarmMini_Phase2_20261125.sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
JOIN SmartFarmMini_Phase2_20261125.sys.columns col ON col.object_id=ic.object_id AND col.column_id=ic.column_id
WHERE i.object_id=OBJECT_ID(N'SmartFarmMini_Phase2_20261125.dbo.DeviceCommands') AND i.name=N'IX_DevCmds_DispatchLease'
GROUP BY i.name,i.is_unique,i.type_desc,i.has_filter;
