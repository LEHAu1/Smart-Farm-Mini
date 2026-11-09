namespace SmartFarm.Application.DTOs.Irrigation
{
    public class IrrigationCommandRequest
    {
        public Guid DeviceId { get; set; }
        public int DurationSeconds { get; set; } = 30;
    }
}
