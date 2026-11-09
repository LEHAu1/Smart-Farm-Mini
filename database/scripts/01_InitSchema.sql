-- ==============================================================================
-- SMART FARM MINI — DATABASE DDL SCHEMA SCRIPT (v2.1 Production-Ready)
-- RDBMS: Microsoft SQL Server (2019/2022)
-- Database Name: SmartFarmMiniDb
-- Schema: 13 Tables (4 Identity UserContext, 1 RefreshTokens, 8 Domain)
-- Bao gồm đầy đủ: Idempotent MQTT MessageId, Strict Check Constraints,
-- Filtered Unique Indexes (chống conflict tưới), và Bảo vệ lịch sử (No Action Delete).
-- ==============================================================================

USE [master];
GO

-- 1. TẠO CƠ SỞ DỮ LIỆU NẾU CHƯA TỒN TẠI
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartFarmMiniDb')
BEGIN
    CREATE DATABASE [SmartFarmMiniDb];
END
GO

USE [SmartFarmMiniDb];
GO

-- ==============================================================================
-- 2. TẠO CÁC BẢNG ASP.NET CORE IDENTITY (Không sử dụng Roles)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BẢNG 1: AspNetUsers (Tài khoản người dùng)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'AspNetUsers' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[AspNetUsers]
    (
        [Id]                   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [UserName]             NVARCHAR(256)    NULL,
        [NormalizedUserName]   NVARCHAR(256)    NULL,
        [Email]                NVARCHAR(256)    NULL,
        [NormalizedEmail]      NVARCHAR(256)    NULL,
        [EmailConfirmed]       BIT              NOT NULL DEFAULT 0,
        [PasswordHash]         NVARCHAR(MAX)    NULL,
        [SecurityStamp]        NVARCHAR(MAX)    NULL,
        [ConcurrencyStamp]     NVARCHAR(MAX)    NULL,
        [PhoneNumber]          NVARCHAR(MAX)    NULL,
        [PhoneNumberConfirmed] BIT              NOT NULL DEFAULT 0,
        [TwoFactorEnabled]     BIT              NOT NULL DEFAULT 0,
        [LockoutEnd]           DATETIMEOFFSET(7) NULL,
        [LockoutEnabled]       BIT              NOT NULL DEFAULT 1,
        [AccessFailedCount]    INT              NOT NULL DEFAULT 0,
        [DisplayName]          NVARCHAR(100)    NULL,
        [CreatedAtUtc]         DATETIMEOFFSET(7) NOT NULL,

        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    CREATE UNIQUE NONCLUSTERED INDEX [UserNameIndex] ON [dbo].[AspNetUsers] ([NormalizedUserName] ASC) WHERE [NormalizedUserName] IS NOT NULL;
    CREATE NONCLUSTERED INDEX [EmailIndex] ON [dbo].[AspNetUsers] ([NormalizedEmail] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 2: AspNetUserClaims (Claims của người dùng)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'AspNetUserClaims' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[AspNetUserClaims]
    (
        [Id]         INT              IDENTITY(1,1) NOT NULL,
        [UserId]     UNIQUEIDENTIFIER NOT NULL,
        [ClaimType]  NVARCHAR(MAX)    NULL,
        [ClaimValue] NVARCHAR(MAX)    NULL,

        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId])
            REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_AspNetUserClaims_UserId] ON [dbo].[AspNetUserClaims] ([UserId] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 3: AspNetUserLogins (Đăng nhập provider ngoài)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'AspNetUserLogins' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[AspNetUserLogins]
    (
        [LoginProvider]       NVARCHAR(128)    NOT NULL,
        [ProviderKey]         NVARCHAR(128)    NOT NULL,
        [ProviderDisplayName] NVARCHAR(MAX)    NULL,
        [UserId]              UNIQUEIDENTIFIER NOT NULL,

        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY CLUSTERED ([LoginProvider] ASC, [ProviderKey] ASC),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId])
            REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_AspNetUserLogins_UserId] ON [dbo].[AspNetUserLogins] ([UserId] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 4: AspNetUserTokens (Token nội bộ Identity)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'AspNetUserTokens' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[AspNetUserTokens]
    (
        [UserId]        UNIQUEIDENTIFIER NOT NULL,
        [LoginProvider] NVARCHAR(128)    NOT NULL,
        [Name]          NVARCHAR(128)    NOT NULL,
        [Value]         NVARCHAR(MAX)    NULL,

        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY CLUSTERED ([UserId] ASC, [LoginProvider] ASC, [Name] ASC),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId])
            REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END
GO

-- ==============================================================================
-- 3. TẠO BẢNG AUTHENTICATION CUSTOM (RefreshTokens)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BẢNG 5: RefreshTokens (JWT Refresh Token Rotation & Token Family)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'RefreshTokens' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[RefreshTokens]
    (
        [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [UserId]              UNIQUEIDENTIFIER NOT NULL,
        [TokenHash]           NVARCHAR(88)     NOT NULL,
        [TokenFamily]         UNIQUEIDENTIFIER NOT NULL,
        [ExpiresAtUtc]        DATETIMEOFFSET(7) NOT NULL,
        [CreatedAtUtc]        DATETIMEOFFSET(7) NOT NULL,
        [RevokedAtUtc]        DATETIMEOFFSET(7) NULL,
        [ReplacedByTokenHash] NVARCHAR(88)     NULL,
        [RevokeReason]        NVARCHAR(100)    NULL,

        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_RefreshTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId])
            REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_RefreshTokens_Expiry] CHECK ([ExpiresAtUtc] > [CreatedAtUtc])
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_RefreshTokens_TokenHash] ON [dbo].[RefreshTokens] ([TokenHash] ASC);
    CREATE NONCLUSTERED INDEX [IX_RefreshTokens_TokenFamily] ON [dbo].[RefreshTokens] ([TokenFamily] ASC);
    CREATE NONCLUSTERED INDEX [IX_RefreshTokens_UserId] ON [dbo].[RefreshTokens] ([UserId] ASC);
    CREATE NONCLUSTERED INDEX [IX_RefreshTokens_ExpiresAtUtc_Active] ON [dbo].[RefreshTokens] ([ExpiresAtUtc] ASC) WHERE [RevokedAtUtc] IS NULL;
END
GO

-- ==============================================================================
-- 4. TẠO CÁC BẢNG DOMAIN (Smart Farm Mini)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BẢNG 6: Devices (Thiết bị IoT ESP32)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'Devices' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[Devices]
    (
        [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [OwnerId]        UNIQUEIDENTIFIER NOT NULL,
        [DeviceCode]     NVARCHAR(50)     NOT NULL,
        [Name]           NVARCHAR(100)    NOT NULL,
        [Description]    NVARCHAR(500)    NULL,
        [IsOnline]       BIT              NOT NULL DEFAULT 0,
        [IsActive]       BIT              NOT NULL DEFAULT 1,
        [CreatedAtUtc]   DATETIMEOFFSET(7) NOT NULL,
        [UpdatedAtUtc]   DATETIMEOFFSET(7) NOT NULL,
        [LastSeenAtUtc]  DATETIMEOFFSET(7) NULL,

        CONSTRAINT [PK_Devices] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Devices_AspNetUsers_OwnerId] FOREIGN KEY ([OwnerId])
            REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_Devices_DeviceCode] UNIQUE NONCLUSTERED ([DeviceCode] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_Devices_OwnerId] ON [dbo].[Devices] ([OwnerId] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 7: SensorReadings (Dữ liệu thô cảm biến - lưu 90 ngày)
-- Thêm MessageId chống duplicate từ MQTT reconnect, ON DELETE NO ACTION bảo vệ lịch sử
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'SensorReadings' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[SensorReadings]
    (
        [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]       UNIQUEIDENTIFIER NOT NULL,
        [MessageId]      UNIQUEIDENTIFIER NULL, -- Idempotency MQTT packet ID
        [SensorType]     TINYINT          NOT NULL, -- 1=SoilMoisture, 2=AirTemp, 3=AirHum, 4=WaterTemp, 5=WaterLevel
        [Value]          DECIMAL(10, 2)   NOT NULL,
        [Unit]           NVARCHAR(20)     NOT NULL,
        [RecordedAtUtc]  DATETIMEOFFSET(7) NOT NULL,
        [ReceivedAtUtc]  DATETIMEOFFSET(7) NOT NULL,

        CONSTRAINT [PK_SensorReadings] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_SensorReadings_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [CK_SensorReadings_ReceivedAfterRecorded] CHECK ([ReceivedAtUtc] >= [RecordedAtUtc])
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_SensorReadings_MessageId_SensorType] ON [dbo].[SensorReadings] ([MessageId] ASC, [SensorType] ASC) WHERE [MessageId] IS NOT NULL;
    CREATE NONCLUSTERED INDEX [IX_SensorReadings_DeviceId_RecordedAt] ON [dbo].[SensorReadings] ([DeviceId] ASC, [RecordedAtUtc] DESC);
    CREATE NONCLUSTERED INDEX [IX_SensorReadings_SensorType_RecordedAt] ON [dbo].[SensorReadings] ([SensorType] ASC, [RecordedAtUtc] DESC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 8: SensorReadingAggregates (Dữ liệu tổng hợp theo giờ - lưu vĩnh viễn)
-- Bổ sung CHECK SampleCount > 0, MinValue <= AvgValue <= MaxValue, SensorType 1..5
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'SensorReadingAggregates' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[SensorReadingAggregates]
    (
        [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]        UNIQUEIDENTIFIER NOT NULL,
        [SensorType]      TINYINT          NOT NULL,
        [HourBucket]      DATETIMEOFFSET(7) NOT NULL,
        [AvgValue]        DECIMAL(10, 2)   NOT NULL,
        [MinValue]        DECIMAL(10, 2)   NOT NULL,
        [MaxValue]        DECIMAL(10, 2)   NOT NULL,
        [SampleCount]     INT              NOT NULL,
        [Unit]            NVARCHAR(20)     NOT NULL,
        [AggregatedAtUtc] DATETIMEOFFSET(7) NOT NULL,

        CONSTRAINT [PK_SensorReadingAggregates] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_SensorReadingAggregates_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [CK_SensorAgg_SampleCount] CHECK ([SampleCount] > 0),
        CONSTRAINT [CK_SensorAgg_Values] CHECK ([MinValue] <= [AvgValue] AND [AvgValue] <= [MaxValue]),
        CONSTRAINT [CK_SensorAgg_SensorType] CHECK ([SensorType] BETWEEN 1 AND 5)
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_SensorAgg_Device_Type_Hour] ON [dbo].[SensorReadingAggregates] ([DeviceId] ASC, [SensorType] ASC, [HourBucket] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 9: IrrigationRules (Quy tắc tưới tự động)
-- Bổ sung CHECK độ ẩm 0..100, MaxDuration 1..300s, Unique Filtered Index 1 active rule/device
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'IrrigationRules' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[IrrigationRules]
    (
        [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]           UNIQUEIDENTIFIER NOT NULL,
        [Name]               NVARCHAR(100)    NOT NULL,
        [MoistureThreshold]  DECIMAL(5, 2)    NOT NULL,
        [TargetMoisture]     DECIMAL(5, 2)    NOT NULL,
        [MinIntervalMinutes] INT              NOT NULL,
        [MaxDurationSeconds] INT              NOT NULL,
        [IsEnabled]          BIT              NOT NULL DEFAULT 1,
        [CreatedAtUtc]       DATETIMEOFFSET(7) NOT NULL,
        [UpdatedAtUtc]       DATETIMEOFFSET(7) NOT NULL,
        [LastTriggeredAtUtc] DATETIMEOFFSET(7) NULL,

        CONSTRAINT [PK_IrrigationRules] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_IrrigationRules_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [CK_IrrigRules_TargetGtThreshold] CHECK ([TargetMoisture] > [MoistureThreshold]),
        CONSTRAINT [CK_IrrigRules_MoistureRange] CHECK ([MoistureThreshold] >= 0 AND [MoistureThreshold] <= 100 AND [TargetMoisture] >= 0 AND [TargetMoisture] <= 100),
        CONSTRAINT [CK_IrrigRules_MaxDuration] CHECK ([MaxDurationSeconds] > 0 AND [MaxDurationSeconds] <= 300),
        CONSTRAINT [CK_IrrigRules_MinInterval] CHECK ([MinIntervalMinutes] >= 0)
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_IrrigRules_OneActivePerDevice] ON [dbo].[IrrigationRules] ([DeviceId] ASC) WHERE [IsEnabled] = 1;
    CREATE NONCLUSTERED INDEX [IX_IrrigRules_DeviceId_IsEnabled] ON [dbo].[IrrigationRules] ([DeviceId] ASC, [IsEnabled] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 10: IrrigationLogs (Lịch sử các phiên tưới cây)
-- Bổ sung CHECK thời gian, Unique Filtered Index chỉ 1 phiên tưới InProgress/device
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'IrrigationLogs' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[IrrigationLogs]
    (
        [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]           UNIQUEIDENTIFIER NOT NULL,
        [Mode]               TINYINT          NOT NULL, -- 1=Manual, 2=Automatic
        [Status]             TINYINT          NOT NULL, -- 1=InProgress, 2=Completed, 3=Stopped, 4=Failed
        [SoilMoistureBefore] DECIMAL(5, 2)    NULL,
        [SoilMoistureAfter]  DECIMAL(5, 2)    NULL,
        [WaterAmountMl]      DECIMAL(8, 2)    NULL,
        [StartedAtUtc]       DATETIMEOFFSET(7) NOT NULL,
        [CompletedAtUtc]     DATETIMEOFFSET(7) NULL,
        [DurationSeconds]    INT              NULL,
        [Note]               NVARCHAR(500)    NULL,

        CONSTRAINT [PK_IrrigationLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_IrrigationLogs_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [CK_IrrigLogs_DurationNonNegative] CHECK ([DurationSeconds] IS NULL OR [DurationSeconds] >= 0),
        CONSTRAINT [CK_IrrigLogs_CompletedAfterStarted] CHECK ([CompletedAtUtc] IS NULL OR [CompletedAtUtc] >= [StartedAtUtc]),
        CONSTRAINT [CK_IrrigLogs_InProgressNoCompleted] CHECK (([Status] = 1 AND [CompletedAtUtc] IS NULL) OR ([Status] != 1))
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_IrrigLogs_OneRunningPerDevice] ON [dbo].[IrrigationLogs] ([DeviceId] ASC) WHERE [Status] = 1;
    CREATE NONCLUSTERED INDEX [IX_IrrigLogs_DeviceId_StartedAt] ON [dbo].[IrrigationLogs] ([DeviceId] ASC, [StartedAtUtc] DESC);
    CREATE NONCLUSTERED INDEX [IX_IrrigLogs_InProgress] ON [dbo].[IrrigationLogs] ([Status] ASC) WHERE [Status] = 1;
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 11: Alerts (Cảnh báo bất thường)
-- ON DELETE NO ACTION bảo vệ lịch sử sự cố
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'Alerts' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[Alerts]
    (
        [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]      UNIQUEIDENTIFIER NOT NULL,
        [AlertCode]     NVARCHAR(50)     NOT NULL,
        [Title]         NVARCHAR(150)    NOT NULL,
        [Message]       NVARCHAR(1000)   NOT NULL,
        [Severity]      TINYINT          NOT NULL, -- 1=Info, 2=Warning, 3=Critical
        [IsResolved]    BIT              NOT NULL DEFAULT 0,
        [CreatedAtUtc]  DATETIMEOFFSET(7) NOT NULL,
        [ResolvedAtUtc] DATETIMEOFFSET(7) NULL,

        CONSTRAINT [PK_Alerts] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Alerts_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION
    );

    CREATE NONCLUSTERED INDEX [IX_Alerts_DeviceId_IsResolved_Created] ON [dbo].[Alerts] ([DeviceId] ASC, [IsResolved] ASC, [CreatedAtUtc] DESC);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 12: DeviceCommands (Lệnh điều khiển gửi tới ESP32)
-- Bổ sung CHECK Status 1..4, ON DELETE NO ACTION
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'DeviceCommands' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[DeviceCommands]
    (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DeviceId]          UNIQUEIDENTIFIER NOT NULL,
        [CommandCode]       NVARCHAR(50)     NOT NULL, -- Loại lệnh: START_PUMP, STOP_PUMP (KHÔNG UNIQUE)
        [Action]            NVARCHAR(50)     NOT NULL,
        [Payload]           NVARCHAR(MAX)    NULL,
        [Status]            TINYINT          NOT NULL DEFAULT 1, -- 1=Pending, 2=Acknowledged, 3=Completed, 4=Failed
        [CreatedAtUtc]      DATETIMEOFFSET(7) NOT NULL,
        [AcknowledgedAtUtc] DATETIMEOFFSET(7) NULL,
        [CompletedAtUtc]    DATETIMEOFFSET(7) NULL,
        [ErrorMessage]      NVARCHAR(1000)   NULL,

        CONSTRAINT [PK_DeviceCommands] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_DeviceCommands_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [CK_DevCmds_Status] CHECK ([Status] BETWEEN 1 AND 4)
    );

    CREATE NONCLUSTERED INDEX [IX_DevCmds_DeviceId_Status] ON [dbo].[DeviceCommands] ([DeviceId] ASC, [Status] ASC);
    CREATE NONCLUSTERED INDEX [IX_DevCmds_CreatedAt_Done] ON [dbo].[DeviceCommands] ([CreatedAtUtc] ASC) WHERE [Status] IN (3, 4);
END
GO

-- ------------------------------------------------------------------------------
-- BẢNG 13: SystemLogs (Nhật ký hệ thống tổng hợp)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'SystemLogs' AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[SystemLogs]
    (
        [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [Level]            TINYINT          NOT NULL, -- 1=Debug, 2=Info, 3=Warning, 4=Error, 5=Critical
        [Source]           TINYINT          NOT NULL, -- 1=Backend, 2=Device, 3=Sensor, 4=Irrigation, 5=System
        [EventCode]        NVARCHAR(50)     NOT NULL,
        [Message]          NVARCHAR(MAX)    NOT NULL,
        [ExceptionDetails] NVARCHAR(MAX)    NULL,
        [DeviceId]         UNIQUEIDENTIFIER NULL,
        [CreatedAtUtc]     DATETIMEOFFSET(7) NOT NULL,

        CONSTRAINT [PK_SystemLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_SystemLogs_Devices_DeviceId] FOREIGN KEY ([DeviceId])
            REFERENCES [dbo].[Devices] ([Id]) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX [IX_SysLogs_Level_CreatedAt] ON [dbo].[SystemLogs] ([Level] ASC, [CreatedAtUtc] DESC);
    CREATE NONCLUSTERED INDEX [IX_SysLogs_DeviceId_CreatedAt] ON [dbo].[SystemLogs] ([DeviceId] ASC, [CreatedAtUtc] DESC) WHERE [DeviceId] IS NOT NULL;
END
GO
