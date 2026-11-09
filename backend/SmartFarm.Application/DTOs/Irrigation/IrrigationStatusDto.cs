using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Irrigation
{
    public class IrrigationStatusDto
    {
        public Guid DeviceId { get; init; }
        public bool IsPumpRunning { get; init; }
        public IrrigationMode CurrentMode { get; init; }
        public DateTimeOffset? LastIrrigationStartedAtUtc { get; init; }
        public int? LastIrrigationDurationSeconds { get; init; }
        public decimal? LastSoilMoisture { get; init; }
    }
}
