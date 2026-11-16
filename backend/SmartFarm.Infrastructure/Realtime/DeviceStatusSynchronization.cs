namespace SmartFarm.Infrastructure.Realtime
{
    /// <summary>
    /// Serializes online/offline state changes inside one Web API process.
    /// The repository update remains conditional on LastSeenAtUtc for multi-process safety.
    /// </summary>
    public sealed class DeviceStatusSynchronization
    {
        public SemaphoreSlim Gate { get; } = new(1, 1);
    }
}
