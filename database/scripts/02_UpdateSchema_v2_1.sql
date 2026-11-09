-- ==============================================================================
-- SMART FARM MINI — DATABASE MIGRATION SCRIPT (v2.1)
-- Áp dụng trực tiếp vào CSDL SmartFarmMiniDb trên SQL Server DANG
-- Cập nhật MessageId Idempotency, Check Constraints, Filtered Unique Indexes
-- và đổi chính sách FK sang ON DELETE NO ACTION để bảo vệ lịch sử.
-- ==============================================================================

USE [SmartFarmMiniDb];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT 'Bắt đầu nâng cấp schema SmartFarmMiniDb lên v2.1...';
GO

-- ------------------------------------------------------------------------------
-- 1. CẬP NHẬT BẢNG SensorReadings
-- ------------------------------------------------------------------------------
PRINT '1. Cập nhật SensorReadings...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SensorReadings]') AND name = N'MessageId')
BEGIN
    ALTER TABLE [dbo].[SensorReadings] ADD [MessageId] UNIQUEIDENTIFIER NULL;
    PRINT '-> Đã thêm cột MessageId vào SensorReadings.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_SensorReadings_MessageId_SensorType' AND object_id = OBJECT_ID(N'[dbo].[SensorReadings]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_SensorReadings_MessageId_SensorType]
    ON [dbo].[SensorReadings] ([MessageId] ASC, [SensorType] ASC)
    WHERE [MessageId] IS NOT NULL;
    PRINT '-> Đã tạo index IX_SensorReadings_MessageId_SensorType.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_SensorReadings_ReceivedAfterRecorded')
BEGIN
    ALTER TABLE [dbo].[SensorReadings]
    ADD CONSTRAINT [CK_SensorReadings_ReceivedAfterRecorded] CHECK ([ReceivedAtUtc] >= [RecordedAtUtc]);
    PRINT '-> Đã thêm CHECK constraint CK_SensorReadings_ReceivedAfterRecorded.';
END
GO

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_SensorReadings_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[SensorReadings] DROP CONSTRAINT [FK_SensorReadings_Devices_DeviceId];
    ALTER TABLE [dbo].[SensorReadings]
    ADD CONSTRAINT [FK_SensorReadings_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_SensorReadings_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

-- ------------------------------------------------------------------------------
-- 2. CẬP NHẬT BẢNG SensorReadingAggregates
-- ------------------------------------------------------------------------------
PRINT '2. Cập nhật SensorReadingAggregates...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_SensorReadingAggregates_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[SensorReadingAggregates] DROP CONSTRAINT [FK_SensorReadingAggregates_Devices_DeviceId];
    ALTER TABLE [dbo].[SensorReadingAggregates]
    ADD CONSTRAINT [FK_SensorReadingAggregates_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_SensorReadingAggregates_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_SensorAgg_SampleCount')
BEGIN
    ALTER TABLE [dbo].[SensorReadingAggregates]
    ADD CONSTRAINT [CK_SensorAgg_SampleCount] CHECK ([SampleCount] > 0);
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_SensorAgg_Values')
BEGIN
    ALTER TABLE [dbo].[SensorReadingAggregates]
    ADD CONSTRAINT [CK_SensorAgg_Values] CHECK ([MinValue] <= [AvgValue] AND [AvgValue] <= [MaxValue]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_SensorAgg_SensorType')
BEGIN
    ALTER TABLE [dbo].[SensorReadingAggregates]
    ADD CONSTRAINT [CK_SensorAgg_SensorType] CHECK ([SensorType] BETWEEN 1 AND 5);
END
GO

-- ------------------------------------------------------------------------------
-- 3. CẬP NHẬT BẢNG IrrigationRules
-- ------------------------------------------------------------------------------
PRINT '3. Cập nhật IrrigationRules...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_IrrigationRules_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[IrrigationRules] DROP CONSTRAINT [FK_IrrigationRules_Devices_DeviceId];
    ALTER TABLE [dbo].[IrrigationRules]
    ADD CONSTRAINT [FK_IrrigationRules_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_IrrigationRules_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_IrrigRules_MoistureRange')
BEGIN
    ALTER TABLE [dbo].[IrrigationRules]
    ADD CONSTRAINT [CK_IrrigRules_MoistureRange] CHECK ([MoistureThreshold] >= 0 AND [MoistureThreshold] <= 100 AND [TargetMoisture] >= 0 AND [TargetMoisture] <= 100);
END
GO

IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_IrrigRules_MaxDuration')
BEGIN
    ALTER TABLE [dbo].[IrrigationRules] DROP CONSTRAINT [CK_IrrigRules_MaxDuration];
END
GO

ALTER TABLE [dbo].[IrrigationRules]
ADD CONSTRAINT [CK_IrrigRules_MaxDuration] CHECK ([MaxDurationSeconds] > 0 AND [MaxDurationSeconds] <= 300);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_IrrigRules_OneActivePerDevice' AND object_id = OBJECT_ID(N'[dbo].[IrrigationRules]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_IrrigRules_OneActivePerDevice]
    ON [dbo].[IrrigationRules] ([DeviceId] ASC)
    WHERE [IsEnabled] = 1;
    PRINT '-> Đã tạo filtered unique index IX_IrrigRules_OneActivePerDevice.';
END
GO

-- ------------------------------------------------------------------------------
-- 4. CẬP NHẬT BẢNG IrrigationLogs
-- ------------------------------------------------------------------------------
PRINT '4. Cập nhật IrrigationLogs...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_IrrigationLogs_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[IrrigationLogs] DROP CONSTRAINT [FK_IrrigationLogs_Devices_DeviceId];
    ALTER TABLE [dbo].[IrrigationLogs]
    ADD CONSTRAINT [FK_IrrigationLogs_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_IrrigationLogs_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_IrrigLogs_DurationNonNegative')
BEGIN
    ALTER TABLE [dbo].[IrrigationLogs]
    ADD CONSTRAINT [CK_IrrigLogs_DurationNonNegative] CHECK ([DurationSeconds] IS NULL OR [DurationSeconds] >= 0);
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_IrrigLogs_CompletedAfterStarted')
BEGIN
    ALTER TABLE [dbo].[IrrigationLogs]
    ADD CONSTRAINT [CK_IrrigLogs_CompletedAfterStarted] CHECK ([CompletedAtUtc] IS NULL OR [CompletedAtUtc] >= [StartedAtUtc]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_IrrigLogs_InProgressNoCompleted')
BEGIN
    ALTER TABLE [dbo].[IrrigationLogs]
    ADD CONSTRAINT [CK_IrrigLogs_InProgressNoCompleted] CHECK (([Status] = 1 AND [CompletedAtUtc] IS NULL) OR ([Status] != 1));
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_IrrigLogs_OneRunningPerDevice' AND object_id = OBJECT_ID(N'[dbo].[IrrigationLogs]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_IrrigLogs_OneRunningPerDevice]
    ON [dbo].[IrrigationLogs] ([DeviceId] ASC)
    WHERE [Status] = 1;
    PRINT '-> Đã tạo filtered unique index IX_IrrigLogs_OneRunningPerDevice.';
END
GO

-- ------------------------------------------------------------------------------
-- 5. CẬP NHẬT BẢNG Alerts
-- ------------------------------------------------------------------------------
PRINT '5. Cập nhật Alerts...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_Alerts_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[Alerts] DROP CONSTRAINT [FK_Alerts_Devices_DeviceId];
    ALTER TABLE [dbo].[Alerts]
    ADD CONSTRAINT [FK_Alerts_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_Alerts_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

-- ------------------------------------------------------------------------------
-- 6. CẬP NHẬT BẢNG DeviceCommands
-- ------------------------------------------------------------------------------
PRINT '6. Cập nhật DeviceCommands...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_DeviceCommands_Devices_DeviceId')
BEGIN
    ALTER TABLE [dbo].[DeviceCommands] DROP CONSTRAINT [FK_DeviceCommands_Devices_DeviceId];
    ALTER TABLE [dbo].[DeviceCommands]
    ADD CONSTRAINT [FK_DeviceCommands_Devices_DeviceId] FOREIGN KEY ([DeviceId])
        REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION;
    PRINT '-> Đã chuyển FK_DeviceCommands_Devices_DeviceId sang ON DELETE NO ACTION.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_DevCmds_Status')
BEGIN
    ALTER TABLE [dbo].[DeviceCommands]
    ADD CONSTRAINT [CK_DevCmds_Status] CHECK ([Status] BETWEEN 1 AND 4);
END
GO

PRINT 'Nâng cấp schema SmartFarmMiniDb lên v2.1 THÀNH CÔNG 100%!';
GO
