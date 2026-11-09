using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Irrigation
{
    public class CreateIrrigationLogRequest
    {
        public Guid DeviceId { get; set; }
        public IrrigationMode Mode { get; set; } = IrrigationMode.Manual;
        public decimal? SoilMoistureBefore { get; set; }
    }

    public class CompleteIrrigationLogRequest
    {
        public decimal? SoilMoistureAfter { get; set; }
        public decimal? WaterAmountMl { get; set; }
        public string? Note { get; set; }
    }
}

