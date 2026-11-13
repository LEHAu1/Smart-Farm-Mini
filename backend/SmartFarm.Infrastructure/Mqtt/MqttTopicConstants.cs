namespace SmartFarm.Infrastructure.Mqtt
{
    public static class MqttTopicConstants
    {
        public const string DeviceTopicPrefix = "smartfarm/device";
        public const string TelemetrySuffix = "telemetry";
        public const string CommandSuffix = "command";
        public const string AcknowledgementSuffix = "ack";
        public const string TelemetryPattern = DeviceTopicPrefix + "/+/" + TelemetrySuffix;
        public const string CommandPattern = DeviceTopicPrefix + "/{0}/" + CommandSuffix;
        public const string AcknowledgementPattern = DeviceTopicPrefix + "/+/" + AcknowledgementSuffix;
    }
}
