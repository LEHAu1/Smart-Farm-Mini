using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.Alert
{
    public class AlertDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public string AlertCode { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public string Message { get; init; } = string.Empty;
        public AlertSeverity Severity { get; init; }
        public string SeverityName => Severity.ToString();
        public bool IsResolved { get; init; }
        public DateTimeOffset CreatedAtUtc { get; init; }
        public DateTimeOffset? ResolvedAtUtc { get; init; }
    }
}
