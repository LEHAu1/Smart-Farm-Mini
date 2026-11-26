using System.ComponentModel.DataAnnotations;

namespace SmartFarm.Application.DTOs.Device
{
    public sealed class TransferDeviceOwnershipRequest
    {
        [Required]
        public Guid TargetOwnerId { get; init; }
    }
}
