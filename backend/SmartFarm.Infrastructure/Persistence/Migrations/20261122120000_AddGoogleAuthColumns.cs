using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFarm.Infrastructure.Persistence.Migrations;

public partial class AddGoogleAuthColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Keep this migration safe when the older, idempotent v2.2 SQL script
        // has already added some or all of these columns.
        migrationBuilder.Sql("""
            IF COL_LENGTH(N'dbo.AspNetUsers', N'GoogleSubjectId') IS NULL
                ALTER TABLE [dbo].[AspNetUsers] ADD [GoogleSubjectId] nvarchar(128) NULL;

            IF COL_LENGTH(N'dbo.AspNetUsers', N'AuthProvider') IS NULL
                ALTER TABLE [dbo].[AspNetUsers] ADD [AuthProvider] nvarchar(50) NULL
                    CONSTRAINT [DF_AspNetUsers_AuthProvider] DEFAULT N'Local';

            IF COL_LENGTH(N'dbo.AspNetUsers', N'AvatarUrl') IS NULL
                ALTER TABLE [dbo].[AspNetUsers] ADD [AvatarUrl] nvarchar(500) NULL;

            UPDATE [dbo].[AspNetUsers]
            SET [AuthProvider] = N'Local'
            WHERE [AuthProvider] IS NULL;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE [name] = N'IX_AspNetUsers_GoogleSubjectId'
                  AND [object_id] = OBJECT_ID(N'[dbo].[AspNetUsers]'))
                CREATE UNIQUE NONCLUSTERED INDEX [IX_AspNetUsers_GoogleSubjectId]
                    ON [dbo].[AspNetUsers] ([GoogleSubjectId] ASC)
                    WHERE [GoogleSubjectId] IS NOT NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // These nullable compatibility columns may have been created earlier
        // by database/scripts/03_AddGoogleAuth_v2_2.sql. A rollback cannot
        // reliably tell which installation path created them, so preserve the
        // schema and any stored auth profile data instead of dropping it.
    }
}
