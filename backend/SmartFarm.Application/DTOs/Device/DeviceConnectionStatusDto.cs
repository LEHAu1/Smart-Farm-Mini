namespace SmartFarm.Application.DTOs.Device
{
    /// <summary>
    /// DTO thông tin trạng thái kết nối của thiết bị IoT
    /// </summary>
    public class DeviceConnectionStatusDto
    {
        public Guid DeviceId { get; set; }
        public string DeviceCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsOnline { get; set; }
        public DateTimeOffset? LastSeenAtUtc { get; set; }
        public string ConnectionStatus => IsOnline ? "Online" : "Offline";
    }
}

