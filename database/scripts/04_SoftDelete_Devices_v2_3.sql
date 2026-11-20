-- ============================================================
-- Migration: 04_SoftDelete_Devices_v2_3.sql
-- Version: v2.3
-- Description: Thêm Soft Delete (IsDeleted, DeletedAtUtc) vào bảng Devices.
--              Thiết bị bị xóa vẫn giữ toàn bộ dữ liệu lịch sử
--              (SensorReadings, IrrigationLogs, Alerts, DeviceCommands, SystemLogs).
--              Không thay đổi bất kỳ FK nào ở bảng khác.
-- Impact:      Chỉ thêm 2 cột mới vào bảng Devices (non-breaking).
--              EF Core Global Query Filter sẽ tự động lọc IsDeleted=1.
-- ============================================================

USE [SmartFarmMiniDb];
GO

-- 1. Thêm cột IsDeleted nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Devices]')
      AND name = N'IsDeleted'
)
BEGIN
    ALTER TABLE [dbo].[Devices]
    ADD [IsDeleted] BIT NOT NULL CONSTRAINT [DF_Devices_IsDeleted] DEFAULT (0);
    PRINT 'Column [IsDeleted] added to [Devices].';
END
ELSE
BEGIN
    PRINT 'Column [IsDeleted] already exists in [Devices] - skipped.';
END
GO

-- 2. Thêm cột DeletedAtUtc nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Devices]')
      AND name = N'DeletedAtUtc'
)
BEGIN
    ALTER TABLE [dbo].[Devices]
    ADD [DeletedAtUtc] DATETIMEOFFSET NULL;
    PRINT 'Column [DeletedAtUtc] added to [Devices].';
END
ELSE
BEGIN
    PRINT 'Column [DeletedAtUtc] already exists in [Devices] - skipped.';
END
GO

-- 3. Tạo index hỗ trợ filter IsDeleted để tối ưu hóa query thông thường
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'[dbo].[Devices]')
      AND name = N'IX_Devices_IsDeleted'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Devices_IsDeleted]
    ON [dbo].[Devices] ([IsDeleted] ASC)
    INCLUDE ([OwnerId], [DeviceCode], [Name], [IsActive], [IsOnline]);
    PRINT 'Index [IX_Devices_IsDeleted] created.';
END
GO

PRINT 'Migration 04_SoftDelete_Devices_v2_3 completed successfully.';
GO
