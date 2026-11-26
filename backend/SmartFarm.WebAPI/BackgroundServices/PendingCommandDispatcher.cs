using Microsoft.Extensions.Options;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Infrastructure.Mqtt;

namespace SmartFarm.WebAPI.BackgroundServices
{
    /// <summary>
    /// Serializes the in-process retry scan and publishes eligible pending commands.
    /// Delivery remains at-least-once; command IDs must be deduplicated by device firmware.
    /// </summary>
    public sealed class PendingCommandDispatcher
    {
        private readonly HashSet<Guid> _expiryLogged = new();
        private readonly SemaphoreSlim _dispatchGate = new(1, 1);
        private readonly Guid _leaseOwnerId = Guid.NewGuid();
        private readonly MqttBrokerSettings _settings;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<PendingCommandDispatcher> _logger;

        public PendingCommandDispatcher(
            IOptions<MqttBrokerSettings> settings,
            TimeProvider timeProvider,
            ILogger<PendingCommandDispatcher> logger)
        {
            _settings = settings.Value;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task DispatchAsync(
            IDeviceService devices,
            IDeviceCommandService commands,
            IMqttPublisher publisher,
            CancellationToken cancellationToken)
        {
            if (!_settings.CommandDispatchEnabled)
            {
                _logger.LogDebug("MQTT command dispatch is disabled; pending commands will not be queried or published.");
                return;
            }

            await _dispatchGate.WaitAsync(cancellationToken);
            try
            {
                var allDevices = await devices.GetAllAsync(cancellationToken);
                var maxRetries = Math.Clamp(_settings.MaxPendingCommandRetries, 1, 20);
                var baseDelay = TimeSpan.FromSeconds(Math.Clamp(_settings.PendingCommandRetrySeconds, 5, 3600));
                var offlineAfter = TimeSpan.FromSeconds(Math.Clamp(_settings.DeviceOfflineAfterSeconds, 15, 86400));
                var observedPendingCommandIds = new HashSet<Guid>();

                foreach (var device in allDevices)
                {
                    var pending = await commands.GetPendingCommandsAsync(device.Id, cancellationToken);
                    foreach (var command in pending)
                    {
                        observedPendingCommandIds.Add(command.Id);
                        var now = _timeProvider.GetUtcNow();

                        // Expiry stops replay even while a device is offline. Keep Pending
                        // because an earlier publish may have reached the device without an ACK.
                        if (now >= command.ExpiresAtUtc)
                        {
                            if (_expiryLogged.Add(command.Id))
                            {
                                _logger.LogWarning(
                                    "Command {CommandId} remains Pending but retry window expired; it was not marked Failed because delivery is ambiguous.",
                                    command.Id);
                            }

                            continue;
                        }

                        if (!IsDispatchEligible(device.IsActive, device.IsOnline, device.LastSeenAtUtc, now, offlineAfter))
                            continue;

                        if (command.DispatchAttemptCount >= maxRetries)
                            continue;

                        // The durable lease is both the cross-instance claim and retry
                        // cooldown. The repository rechecks status, expiry, heartbeat, and
                        // attempt limit atomically before granting it.
                        var retryDelaySeconds = Math.Max(
                            baseDelay.TotalSeconds,
                            Math.Min(baseDelay.TotalSeconds * Math.Pow(2, command.DispatchAttemptCount), 60));
                        var leaseUntilUtc = now.AddSeconds(retryDelaySeconds);
                        if (leaseUntilUtc > command.ExpiresAtUtc)
                            leaseUntilUtc = command.ExpiresAtUtc;

                        var claimed = await commands.TryAcquireDispatchLeaseAsync(
                            command.Id,
                            _leaseOwnerId,
                            now,
                            leaseUntilUtc,
                            now.Subtract(offlineAfter),
                            maxRetries,
                            cancellationToken);
                        if (!claimed)
                            continue;

                        try
                        {
                            await publisher.PublishCommandAsync(device.DeviceCode, command, cancellationToken);
                        }
                        catch (MqttPublishNotStartedException)
                        {
                            // This exception guarantees no packet was started, so release
                            // immediately and don't consume a durable dispatch attempt.
                            await commands.ReleaseDispatchLeaseAsync(command.Id, _leaseOwnerId, cancellationToken);
                            return;
                        }
                        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                        {
                            throw;
                        }
                        catch (Exception exception)
                        {
                            _logger.LogWarning(exception,
                                "Retry publish result is uncertain for command {CommandId}; command remains Pending.", command.Id);
                        }
                    }
                }

                _expiryLogged.RemoveWhere(id => !observedPendingCommandIds.Contains(id));
            }
            finally
            {
                _dispatchGate.Release();
            }
        }

        private static bool IsDispatchEligible(
            bool isActive,
            bool isOnline,
            DateTimeOffset? lastSeenAtUtc,
            DateTimeOffset now,
            TimeSpan offlineAfter)
        {
            return isActive
                && isOnline
                && lastSeenAtUtc.HasValue
                && lastSeenAtUtc.Value <= now
                && lastSeenAtUtc.Value >= now.Subtract(offlineAfter);
        }
    }
}
