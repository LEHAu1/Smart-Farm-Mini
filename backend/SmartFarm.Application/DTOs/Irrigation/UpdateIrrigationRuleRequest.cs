namespace SmartFarm.Application.DTOs.Irrigation
{
    public class UpdateIrrigationRuleRequest
    {
        public string Name { get; set; } = string.Empty;
        public decimal MoistureThreshold { get; set; }
        public decimal TargetMoisture { get; set; }
        public int MinIntervalMinutes { get; set; }
        public int MaxDurationSeconds { get; set; }
    }
}
