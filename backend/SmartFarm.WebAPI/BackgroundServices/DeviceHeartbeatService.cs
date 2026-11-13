using Microsoft.Extensions.Options;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.Infrastructure.Realtime;

namespace SmartFarm.WebAPI.BackgroundServices
{
    public sealed class DeviceHeartbeatService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly MqttBrokerSettings _settings;
        private readonly DeviceStatusSynchronization _deviceStatusSynchronization;
        private readonly ILogger<DeviceHeartbeatService> _logger;

        public DeviceHeartbeatService(
            IServiceScopeFactory scopeFactory,
            IOptions<MqttBrokerSettings> settings,
            DeviceStatusSynchronization deviceStatusSynchronization,
            ILogger<DeviceHeartbeatService> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings.Value;
            _deviceStatusSynchronization = deviceStatusSynchronization;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("Device offline detection is disabled because MQTT is disabled.");
                return;
            }

            var interval = TimeSpan.FromSeconds(Math.Clamp(_settings.HeartbeatIntervalSeconds, 5, 3600));
            using var timer = new PeriodicTimer(interval);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await MarkStaleDevicesOfflineAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "Failed to update stale device connection status.");
                }

                try
                {
                    if (!await timer.WaitForNextTickAsync(stoppingToken))
                        break;
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }

        private async Task MarkStaleDevicesOfflineAsync(CancellationToken cancellationToken)
        {
            var offlineAfter = TimeSpan.FromSeconds(Math.Clamp(_settings.DeviceOfflineAfterSeconds, 15, 86400));
            var cutoff = DateTimeOffset.UtcNow.Subtract(offlineAfter);

            await using var scope = _scopeFactory.CreateAsyncScope();
            var devices = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
            var notifier = scope.ServiceProvider.GetRequiredService<ISensorHubNotifier>();
            await _deviceStatusSynchronization.Gate.WaitAsync(cancellationToken);
            try
            {
                var staleDevices = await devices.GetOnlineDevicesLastSeenBeforeAsync(cutoff, cancellationToken);
                if (staleDevices.Count == 0)
                    return;

                var now = DateTimeOffset.UtcNow;
                var changedCount = await devices.MarkOnlineDevicesOfflineBeforeAsync(cutoff, now, cancellationToken);
                if (changedCount == 0)
                    return;

                // Re-read after the conditional update. The shared process lock
                // prevents an MQTT heartbeat from racing this transition and notice.
                var currentDevices = await devices.GetByIdsAsync(staleDevices.Select(device => device.Id).ToArray(), cancellationToken);
                var offlineDevices = currentDevices.Where(device => !device.IsOnline).ToList();
                foreach (var device in offlineDevices)
                {
                    await notifier.NotifyConnectionStatusAsync(device.OwnerId, new DeviceConnectionStatusDto
                    {
                        DeviceId = device.Id,
                        DeviceCode = device.DeviceCode,
                        Name = device.Name,
                        IsOnline = false,
                        LastSeenAtUtc = device.LastSeenAtUtc
                    }, cancellationToken);
                }

                _logger.LogInformation("Marked {Count} device(s) offline after missing MQTT heartbeats.", changedCount);
            }
            finally
            {
                _deviceStatusSynchronization.Gate.Release();
            }
        }
    }
}
