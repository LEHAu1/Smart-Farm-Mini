namespace SmartFarm.Application.DTOs.Irrigation
{
    public class IrrigationRuleDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public string Name { get; init; } = string.Empty;
        public decimal MoistureThreshold { get; init; }
        public decimal TargetMoisture { get; init; }
        public int MinIntervalMinutes { get; init; }
        public int MaxDurationSeconds { get; init; }
        public bool IsEnabled { get; init; }
        public DateTimeOffset CreatedAtUtc { get; init; }
        public DateTimeOffset UpdatedAtUtc { get; init; }
        public DateTimeOffset? LastTriggeredAtUtc { get; init; }
    }
}
