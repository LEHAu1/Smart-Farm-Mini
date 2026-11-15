using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Sensor
{
    public class SensorAggregateDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public SensorType SensorType { get; init; }
        public string SensorTypeName => SensorType.ToString();
        public DateTimeOffset HourBucket { get; init; }
        public decimal AvgValue { get; init; }
        public decimal MinValue { get; init; }
        public decimal MaxValue { get; init; }
        public int SampleCount { get; init; }
        public string Unit { get; init; } = string.Empty;
        public DateTimeOffset AggregatedAtUtc { get; init; }
    }
}

