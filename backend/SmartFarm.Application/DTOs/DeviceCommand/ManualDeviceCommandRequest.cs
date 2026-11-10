using System.ComponentModel.DataAnnotations;

namespace SmartFarm.Application.DTOs.DeviceCommand
{
    public sealed class ManualDeviceCommandRequest
    {
        [Required]
        [StringLength(50)]
        public string Action { get; init; } = string.Empty;

        public string? Payload { get; init; }
    }
}
