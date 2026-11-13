using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFarm.Infrastructure.Persistence.Migrations;

public partial class SensorReadingCompatibilityFix : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "MessageId",
            table: "SensorReadings",
            type: "uniqueidentifier",
            nullable: true);

        migrationBuilder.DropForeignKey(
            name: "FK_SensorReadings_Devices_DeviceId",
            table: "SensorReadings");

        migrationBuilder.AddForeignKey(
            name: "FK_SensorReadings_Devices_DeviceId",
            table: "SensorReadings",
            column: "DeviceId",
            principalTable: "Devices",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.CreateIndex(
            name: "IX_SensorReadings_MessageId_SensorType",
            table: "SensorReadings",
            columns: new[] { "MessageId", "SensorType" },
            unique: true,
            filter: "[MessageId] IS NOT NULL");

        migrationBuilder.AddCheckConstraint(
            name: "CK_SensorReadings_ReceivedAfterRecorded",
            table: "SensorReadings",
            sql: "[ReceivedAtUtc] >= [RecordedAtUtc]");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "CK_SensorReadings_ReceivedAfterRecorded",
            table: "SensorReadings");

        migrationBuilder.DropIndex(
            name: "IX_SensorReadings_MessageId_SensorType",
            table: "SensorReadings");

        migrationBuilder.DropForeignKey(
            name: "FK_SensorReadings_Devices_DeviceId",
            table: "SensorReadings");

        migrationBuilder.DropColumn(
            name: "MessageId",
            table: "SensorReadings");

        migrationBuilder.AddForeignKey(
            name: "FK_SensorReadings_Devices_DeviceId",
            table: "SensorReadings",
            column: "DeviceId",
            principalTable: "Devices",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }
}
