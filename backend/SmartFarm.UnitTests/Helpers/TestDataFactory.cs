using System;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.UnitTests.Helpers
{
    public static class TestDataFactory
    {
        public static Device CreateDevice(
            Guid? ownerId = null,
            string code = "NODE-01",
            string name = "Farm Sensor Node",
            DateTimeOffset? createdAtUtc = null,
            string? description = null)
        {
            return new Device(
                ownerId ?? Guid.NewGuid(),
                code,
                name,
                createdAtUtc ?? DateTimeOffset.UtcNow,
                description);
        }

        public static SensorReading CreateSensorReading(
            Guid deviceId,
            SensorType type = SensorType.SoilMoisture,
            decimal value = 45.0m,
            string unit = "%",
            DateTimeOffset? timestampUtc = null)
        {
            var time = timestampUtc ?? DateTimeOffset.UtcNow;
            return new SensorReading(deviceId, type, value, unit, time, time);
        }

        public static IrrigationRule CreateIrrigationRule(
            Guid deviceId,
            string name = "Auto Watering Rule",
            decimal threshold = 30.0m,
            decimal target = 65.0m,
            int minInterval = 60,
            int maxDuration = 180,
            DateTimeOffset? createdAtUtc = null)
        {
            return new IrrigationRule(
                deviceId,
                name,
                threshold,
                target,
                minInterval,
                maxDuration,
                createdAtUtc ?? DateTimeOffset.UtcNow);
        }

        public static Alert CreateAlert(
            Guid deviceId,
            string code = "LOW_MOISTURE",
            string title = "Soil Moisture Low",
            string message = "Soil moisture level is below threshold",
            AlertSeverity severity = AlertSeverity.Warning,
            DateTimeOffset? createdAtUtc = null)
        {
            return new Alert(
                deviceId,
                code,
                title,
                message,
                severity,
                createdAtUtc ?? DateTimeOffset.UtcNow);
        }
    }
}
