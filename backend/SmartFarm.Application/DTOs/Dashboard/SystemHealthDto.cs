namespace SmartFarm.Application.DTOs.Dashboard
{
    /// <summary>
    /// DTO thông tin trạng thái sức khỏe của các thành phần hạ tầng hệ thống
    /// </summary>
    public class SystemHealthDto
    {
        /// <summary>
        /// Trạng thái hoạt động của ASP.NET Core Web API (Healthy / Degraded)
        /// </summary>
        public string BackendStatus { get; init; } = "Healthy";

        /// <summary>
        /// Trạng thái kết nối tới cơ sở dữ liệu SQL Server (Ready / Unhealthy)
        /// </summary>
        public string DatabaseStatus { get; init; } = "Ready";

        /// <summary>
        /// Trạng thái kết nối của MQTT Client tới MQTT Broker (Connected / Disabled / Disconnected)
        /// </summary>
        public string MqttBrokerStatus { get; init; } = "Disconnected";

        /// <summary>
        /// Cấu hình MQTT có đang được bật trong hệ thống không
        /// </summary>
        public bool IsMqttEnabled { get; init; }

        /// <summary>
        /// Thời điểm kiểm tra trạng thái UTC
        /// </summary>
        public DateTimeOffset TimestampUtc { get; init; } = DateTimeOffset.UtcNow;
    }
}
