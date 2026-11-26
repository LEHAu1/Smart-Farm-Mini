SET NOCOUNT ON;
SELECT N'SOURCE' AS DbName, (SELECT COUNT(*) FROM SmartFarmMiniDb.dbo.AspNetUsers) AS Users, (SELECT COUNT(*) FROM SmartFarmMiniDb.dbo.Devices) AS Devices, (SELECT COUNT(*) FROM SmartFarmMiniDb.dbo.SensorReadings) AS SensorReadings, (SELECT COUNT(*) FROM SmartFarmMiniDb.dbo.DeviceCommands) AS DeviceCommands, (SELECT COUNT(*) FROM SmartFarmMiniDb.dbo.RefreshTokens) AS RefreshTokens
UNION ALL
SELECT N'CLONE', (SELECT COUNT(*) FROM SmartFarmMini_Phase2_20261125.dbo.AspNetUsers), (SELECT COUNT(*) FROM SmartFarmMini_Phase2_20261125.dbo.Devices), (SELECT COUNT(*) FROM SmartFarmMini_Phase2_20261125.dbo.SensorReadings), (SELECT COUNT(*) FROM SmartFarmMini_Phase2_20261125.dbo.DeviceCommands), (SELECT COUNT(*) FROM SmartFarmMini_Phase2_20261125.dbo.RefreshTokens);
SELECT N'SOURCE_ONLY' AS Direction, COUNT(*) AS CommandBusinessRowDiffs FROM (
 SELECT Id,DeviceId,CommandCode,Action,Payload,Status,CreatedAtUtc,AcknowledgedAtUtc,CompletedAtUtc,ErrorMessage FROM SmartFarmMiniDb.dbo.DeviceCommands
 EXCEPT SELECT Id,DeviceId,CommandCode,Action,Payload,Status,CreatedAtUtc,AcknowledgedAtUtc,CompletedAtUtc,ErrorMessage FROM SmartFarmMini_Phase2_20261125.dbo.DeviceCommands
) d
UNION ALL
SELECT N'CLONE_ONLY', COUNT(*) FROM (
 SELECT Id,DeviceId,CommandCode,Action,Payload,Status,CreatedAtUtc,AcknowledgedAtUtc,CompletedAtUtc,ErrorMessage FROM SmartFarmMini_Phase2_20261125.dbo.DeviceCommands
 EXCEPT SELECT Id,DeviceId,CommandCode,Action,Payload,Status,CreatedAtUtc,AcknowledgedAtUtc,CompletedAtUtc,ErrorMessage FROM SmartFarmMiniDb.dbo.DeviceCommands
) d;
SELECT c.Id, d.DeviceCode, c.CommandCode, c.Action, c.Status, c.CreatedAtUtc, c.Payload,
       c.ExpiresAtUtc, CASE WHEN c.ExpiresAtUtc <= SYSUTCDATETIME() THEN 1 ELSE 0 END AS IsExpired,
       c.DispatchAttemptCount, c.DispatchLeaseOwnerId, c.DispatchLeaseUntilUtc
FROM SmartFarmMini_Phase2_20261125.dbo.DeviceCommands c JOIN SmartFarmMini_Phase2_20261125.dbo.Devices d ON d.Id=c.DeviceId
ORDER BY c.CreatedAtUtc;
SELECT COUNT(*) AS PendingExpiredCount FROM SmartFarmMini_Phase2_20261125.dbo.DeviceCommands WHERE Status=1 AND ExpiresAtUtc <= SYSUTCDATETIME();
