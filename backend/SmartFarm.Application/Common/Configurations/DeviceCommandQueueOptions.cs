namespace SmartFarm.Application.Common.Configurations
{
    public sealed class DeviceCommandQueueOptions
    {
        public int PendingCommandExpiryMinutes { get; set; } = 10;
    }
}
