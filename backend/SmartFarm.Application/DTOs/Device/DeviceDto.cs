namespace SmartFarm.Application.DTOs.Device
{
    public class DeviceDto
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public string DeviceCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsOnline { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAtUtc { get; set; }
        public DateTimeOffset UpdatedAtUtc { get; set; }
        public DateTimeOffset? LastSeenAtUtc { get; set; }
    }
}
