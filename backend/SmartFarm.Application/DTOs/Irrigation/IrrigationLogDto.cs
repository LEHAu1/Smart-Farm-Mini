using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Irrigation
{
    public class IrrigationLogDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public IrrigationMode Mode { get; init; }
        public string ModeName => Mode.ToString();
        public IrrigationStatus Status { get; init; }
        public string StatusName => Status.ToString();
        public decimal? SoilMoistureBefore { get; init; }
        public decimal? SoilMoistureAfter { get; init; }
        public decimal? WaterAmountMl { get; init; }
        public DateTimeOffset StartedAtUtc { get; init; }
        public DateTimeOffset? CompletedAtUtc { get; init; }
        public int? DurationSeconds { get; init; }
        public string? Note { get; init; }
    }
}
