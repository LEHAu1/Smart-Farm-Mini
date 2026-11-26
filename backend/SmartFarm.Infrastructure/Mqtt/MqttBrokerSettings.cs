namespace SmartFarm.Infrastructure.Mqtt
{
    public sealed class MqttBrokerSettings
    {
        public const string SectionName = "Mqtt";

        public bool Enabled { get; set; }
        public string Host { get; set; } = "localhost";
        public int Port { get; set; } = 1883;
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string ClientId { get; set; } = "SmartFarm-WebAPI";
        public bool UseTls { get; set; }
        public bool CommandDispatchEnabled { get; set; }
        public string TelemetryTopicFilter { get; set; } = MqttTopicConstants.TelemetryPattern;
        public string TelemetryDeviceCode { get; set; } = string.Empty;
        public string AcknowledgementTopicFilter { get; set; } = MqttTopicConstants.AcknowledgementPattern;
        public int ReconnectDelaySeconds { get; set; } = 5;
        public int DeviceOfflineAfterSeconds { get; set; } = 90;
        public int HeartbeatIntervalSeconds { get; set; } = 30;
        public int PendingCommandRetrySeconds { get; set; } = 5;
        public int MaxPendingCommandRetries { get; set; } = 5;
        public int PendingCommandExpiryMinutes { get; set; } = 10;
    }
}
