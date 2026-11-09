using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Alert
{
    public class CreateAlertRequest
    {
        public Guid DeviceId { get; set; }
        public string AlertCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public AlertSeverity Severity { get; set; } = AlertSeverity.Warning;
    }
}
