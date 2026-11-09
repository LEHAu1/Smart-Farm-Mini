using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Sensor
{
    public class SensorReadingDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public SensorType SensorType { get; init; }
        public string SensorTypeName => SensorType.ToString();
        public decimal Value { get; init; }
        public string Unit { get; init; } = string.Empty;
        public DateTimeOffset RecordedAtUtc { get; init; }
        public DateTimeOffset ReceivedAtUtc { get; init; }
    }
}
