namespace SmartFarm.Application.DTOs.Device
{
    public class CreateDeviceRequest
    {
        /// <summary>
        /// ID người dùng sở hữu thiết bị.
        /// Sẽ được lấy từ JWT Claims sau khi Authentication được triển khai.
        /// </summary>
        public Guid OwnerId { get; set; }
        public string DeviceCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
