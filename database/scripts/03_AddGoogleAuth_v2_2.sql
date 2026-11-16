-- ==============================================================================
-- SMART FARM MINI — DATABASE MIGRATION SCRIPT (v2.2 Google Authentication)
-- RDBMS: Microsoft SQL Server (2019/2022)
-- Database Name: SmartFarmMiniDb
-- Mục đích: Bổ sung các trường dữ liệu và chỉ mục hỗ trợ Google Login (OAuth 2.0 / OpenID Connect)
-- Bảo tồn 100% dữ liệu tài khoản hiện có và không phá vỡ cấu trúc Identity.
-- ==============================================================================

USE [SmartFarmMiniDb];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. BỔ SUNG CỘT GoogleSubjectId VÀO BẢNG AspNetUsers (NẾU CHƯA CÓ)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[AspNetUsers]') 
      AND name = N'GoogleSubjectId'
)
BEGIN
    ALTER TABLE [dbo].[AspNetUsers]
    ADD [GoogleSubjectId] NVARCHAR(128) NULL;
    PRINT 'Da them cot [GoogleSubjectId] vao bang [AspNetUsers].';
END
GO

-- 2. BỔ SUNG CỘT AuthProvider VÀO BẢNG AspNetUsers (NẾU CHƯA CÓ)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[AspNetUsers]') 
      AND name = N'AuthProvider'
)
BEGIN
    ALTER TABLE [dbo].[AspNetUsers]
    ADD [AuthProvider] NVARCHAR(50) NULL CONSTRAINT [DF_AspNetUsers_AuthProvider] DEFAULT N'Local';
    PRINT 'Da them cot [AuthProvider] vao bang [AspNetUsers].';
END
GO

-- Cập nhật dữ liệu cũ thành 'Local' ở batch riêng biệt
UPDATE [dbo].[AspNetUsers] SET [AuthProvider] = N'Local' WHERE [AuthProvider] IS NULL;
GO

-- 3. BỔ SUNG CỘT AvatarUrl VÀO BẢNG AspNetUsers (NẾU CHƯA CÓ)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[AspNetUsers]') 
      AND name = N'AvatarUrl'
)
BEGIN
    ALTER TABLE [dbo].[AspNetUsers]
    ADD [AvatarUrl] NVARCHAR(500) NULL;
    PRINT 'Da them cot [AvatarUrl] vao bang [AspNetUsers].';
END
GO

-- 4. TẠO FILTERED UNIQUE INDEX CHO GoogleSubjectId ĐẢM BẢO DUY NHẤT VÀ KHÔNG TRÙNG LẶP
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = N'IX_AspNetUsers_GoogleSubjectId' 
      AND object_id = OBJECT_ID(N'[dbo].[AspNetUsers]')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_AspNetUsers_GoogleSubjectId]
    ON [dbo].[AspNetUsers] ([GoogleSubjectId] ASC)
    WHERE [GoogleSubjectId] IS NOT NULL;
    PRINT 'Da tao chi muc duy nhat [IX_AspNetUsers_GoogleSubjectId] tren bang [AspNetUsers].';
END
GO

PRINT '>>> MIGRATION v2.2 (GOOGLE AUTHENTICATION) HOAN TAT THANH CONG! <<<';
GO
