namespace SmartFarm.WebAPI.Configurations
{
    /// <summary>
    /// Cấu hình kết nối MQTT Broker — bind từ appsettings.json section "Mqtt"
    /// </summary>
    public class MqttSettings
    {
        public const string SectionName = "Mqtt";

        /// <summary>Địa chỉ host của MQTT Broker (mặc định: localhost)</summary>
        public string Host { get; set; } = "localhost";

        /// <summary>Cổng MQTT (mặc định: 1883)</summary>
        public int Port { get; set; } = 1883;

        /// <summary>Tên đăng nhập MQTT (tuỳ chọn)</summary>
        public string? Username { get; set; }

        /// <summary>Mật khẩu MQTT (tuỳ chọn)</summary>
        public string? Password { get; set; }

        /// <summary>Client ID định danh kết nối từ WebAPI</summary>
        public string ClientId { get; set; } = "SmartFarm-WebAPI";

        /// <summary>Dùng TLS/SSL (mặc định: false)</summary>
        public bool UseTls { get; set; } = false;

        /// <summary>Thời gian keep-alive giây (mặc định: 60)</summary>
        public int KeepAliveSeconds { get; set; } = 60;

        /// <summary>Số lần thử kết nối lại tối đa (mặc định: 5)</summary>
        public int MaxReconnectAttempts { get; set; } = 5;

        /// <summary>Topic wildcard để subscribe toàn bộ telemetry</summary>
        public string TelemetryTopicPattern { get; set; } = "smartfarm/device/+/telemetry";
    }
}
