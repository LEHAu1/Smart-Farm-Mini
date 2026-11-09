using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Sensor
{
    public class CreateSensorReadingRequest
    {
        public Guid DeviceId { get; set; }
        public SensorType SensorType { get; set; }
        public decimal Value { get; set; }
        public string Unit { get; set; } = string.Empty;
        public DateTimeOffset? RecordedAtUtc { get; set; }
    }
}

