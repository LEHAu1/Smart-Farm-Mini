namespace SmartFarm.Application.DTOs.Sensor
{
    public class SensorTelemetryDto
    {
        public Guid DeviceId { get; init; }
        public decimal? SoilMoisture { get; init; }
        public decimal? AirTemperature { get; init; }
        public decimal? AirHumidity { get; init; }
        public decimal? WaterTemperature { get; init; }
        public decimal? WaterLevel { get; init; }
        public DateTimeOffset? LastUpdatedAtUtc { get; init; }
    }
}
