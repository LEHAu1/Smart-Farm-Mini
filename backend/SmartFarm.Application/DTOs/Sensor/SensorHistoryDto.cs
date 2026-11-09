using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Sensor
{
    public class SensorDataPointDto
    {
        public decimal Value { get; init; }
        public DateTimeOffset TimestampUtc { get; init; }
    }

    public class SensorHistoryDto
    {
        public Guid DeviceId { get; init; }
        public SensorType SensorType { get; init; }
        public string SensorTypeName => SensorType.ToString();
        public string Unit { get; init; } = string.Empty;
        public IReadOnlyList<SensorDataPointDto> DataPoints { get; init; } = Array.Empty<SensorDataPointDto>();
    }
}
