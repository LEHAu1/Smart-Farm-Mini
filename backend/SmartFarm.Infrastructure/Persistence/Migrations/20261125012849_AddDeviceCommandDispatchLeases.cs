using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFarm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceCommandDispatchLeases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DispatchAttemptCount",
                table: "DeviceCommands",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "DispatchLeaseOwnerId",
                table: "DeviceCommands",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DispatchLeaseUntilUtc",
                table: "DeviceCommands",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAtUtc",
                table: "DeviceCommands",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE [dbo].[DeviceCommands]
                SET [ExpiresAtUtc] = DATEADD(MINUTE, 10, [CreatedAtUtc])
                WHERE [ExpiresAtUtc] IS NULL;
                """);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "ExpiresAtUtc",
                table: "DeviceCommands",
                type: "datetimeoffset",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DevCmds_DispatchLease",
                table: "DeviceCommands",
                columns: new[] { "DeviceId", "Status", "DispatchLeaseUntilUtc", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DevCmds_DispatchLease",
                table: "DeviceCommands");

            migrationBuilder.DropColumn(
                name: "DispatchAttemptCount",
                table: "DeviceCommands");

            migrationBuilder.DropColumn(
                name: "DispatchLeaseOwnerId",
                table: "DeviceCommands");

            migrationBuilder.DropColumn(
                name: "DispatchLeaseUntilUtc",
                table: "DeviceCommands");

            migrationBuilder.DropColumn(
                name: "ExpiresAtUtc",
                table: "DeviceCommands");
        }
    }
}
