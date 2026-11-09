using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.DeviceCommand
{
    public class DeviceCommandDto
    {
        public Guid Id { get; init; }
        public Guid DeviceId { get; init; }
        public string CommandCode { get; init; } = string.Empty;
        public string Action { get; init; } = string.Empty;
        public string? Payload { get; init; }
        public CommandStatus Status { get; init; }
        public string StatusName => Status.ToString();
        public DateTimeOffset CreatedAtUtc { get; init; }
        public DateTimeOffset? AcknowledgedAtUtc { get; init; }
        public DateTimeOffset? CompletedAtUtc { get; init; }
        public string? ErrorMessage { get; init; }
    }

    public class CreateDeviceCommandRequest
    {
        public Guid DeviceId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Payload { get; set; }
    }
}

