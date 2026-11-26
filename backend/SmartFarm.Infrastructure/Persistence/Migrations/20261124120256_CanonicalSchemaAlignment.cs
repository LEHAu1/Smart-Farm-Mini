using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFarm.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CanonicalSchemaAlignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alerts_Devices_DeviceId",
                table: "Alerts");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceCommands_Devices_DeviceId",
                table: "DeviceCommands");

            migrationBuilder.DropForeignKey(
                name: "FK_IrrigationLogs_Devices_DeviceId",
                table: "IrrigationLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_IrrigationRules_Devices_DeviceId",
                table: "IrrigationRules");

            migrationBuilder.DropForeignKey(
                name: "FK_SensorReadingAggregates_Devices_DeviceId",
                table: "SensorReadingAggregates");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigRules_MaxDuration",
                table: "IrrigationRules");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAtUtc",
                table: "Devices",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Devices",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SensorAgg_SampleCount",
                table: "SensorReadingAggregates",
                sql: "[SampleCount] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SensorAgg_SensorType",
                table: "SensorReadingAggregates",
                sql: "[SensorType] BETWEEN 1 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SensorAgg_Values",
                table: "SensorReadingAggregates",
                sql: "[MinValue] <= [AvgValue] AND [AvgValue] <= [MaxValue]");

            migrationBuilder.CreateIndex(
                name: "IX_IrrigRules_OneActivePerDevice",
                table: "IrrigationRules",
                column: "DeviceId",
                unique: true,
                filter: "[IsEnabled] = 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigRules_MaxDuration",
                table: "IrrigationRules",
                sql: "[MaxDurationSeconds] > 0 AND [MaxDurationSeconds] <= 300");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigRules_MoistureRange",
                table: "IrrigationRules",
                sql: "[MoistureThreshold] >= 0 AND [MoistureThreshold] <= 100 AND [TargetMoisture] >= 0 AND [TargetMoisture] <= 100");

            migrationBuilder.CreateIndex(
                name: "IX_IrrigLogs_OneRunningPerDevice",
                table: "IrrigationLogs",
                column: "DeviceId",
                unique: true,
                filter: "[Status] = 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigLogs_CompletedAfterStarted",
                table: "IrrigationLogs",
                sql: "[CompletedAtUtc] IS NULL OR [CompletedAtUtc] >= [StartedAtUtc]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigLogs_DurationNonNegative",
                table: "IrrigationLogs",
                sql: "[DurationSeconds] IS NULL OR [DurationSeconds] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigLogs_InProgressNoCompleted",
                table: "IrrigationLogs",
                sql: "([Status] = 1 AND [CompletedAtUtc] IS NULL) OR ([Status] != 1)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DevCmds_Status",
                table: "DeviceCommands",
                sql: "[Status] BETWEEN 1 AND 4");

            migrationBuilder.AddForeignKey(
                name: "FK_Alerts_Devices_DeviceId",
                table: "Alerts",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceCommands_Devices_DeviceId",
                table: "DeviceCommands",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IrrigationLogs_Devices_DeviceId",
                table: "IrrigationLogs",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IrrigationRules_Devices_DeviceId",
                table: "IrrigationRules",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SensorReadingAggregates_Devices_DeviceId",
                table: "SensorReadingAggregates",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alerts_Devices_DeviceId",
                table: "Alerts");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceCommands_Devices_DeviceId",
                table: "DeviceCommands");

            migrationBuilder.DropForeignKey(
                name: "FK_IrrigationLogs_Devices_DeviceId",
                table: "IrrigationLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_IrrigationRules_Devices_DeviceId",
                table: "IrrigationRules");

            migrationBuilder.DropForeignKey(
                name: "FK_SensorReadingAggregates_Devices_DeviceId",
                table: "SensorReadingAggregates");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SensorAgg_SampleCount",
                table: "SensorReadingAggregates");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SensorAgg_SensorType",
                table: "SensorReadingAggregates");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SensorAgg_Values",
                table: "SensorReadingAggregates");

            migrationBuilder.DropIndex(
                name: "IX_IrrigRules_OneActivePerDevice",
                table: "IrrigationRules");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigRules_MaxDuration",
                table: "IrrigationRules");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigRules_MoistureRange",
                table: "IrrigationRules");

            migrationBuilder.DropIndex(
                name: "IX_IrrigLogs_OneRunningPerDevice",
                table: "IrrigationLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigLogs_CompletedAfterStarted",
                table: "IrrigationLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigLogs_DurationNonNegative",
                table: "IrrigationLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IrrigLogs_InProgressNoCompleted",
                table: "IrrigationLogs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DevCmds_Status",
                table: "DeviceCommands");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IrrigRules_MaxDuration",
                table: "IrrigationRules",
                sql: "[MaxDurationSeconds] > 0");

            migrationBuilder.AddForeignKey(
                name: "FK_Alerts_Devices_DeviceId",
                table: "Alerts",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceCommands_Devices_DeviceId",
                table: "DeviceCommands",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_IrrigationLogs_Devices_DeviceId",
                table: "IrrigationLogs",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_IrrigationRules_Devices_DeviceId",
                table: "IrrigationRules",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SensorReadingAggregates_Devices_DeviceId",
                table: "SensorReadingAggregates",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
