using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Infrastructure.Mqtt;

namespace SmartFarm.WebAPI.BackgroundServices
{
    public sealed class MqttHostedService : BackgroundService
    {
        private readonly Dictionary<Guid, PendingCommandRetryState> _pendingRetries = new();
        private readonly MqttClientService _mqttClient;
        private readonly MqttMessageHandler _messageHandler;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly MqttBrokerSettings _settings;
        private readonly ILogger<MqttHostedService> _logger;

        public MqttHostedService(
            MqttClientService mqttClient,
            MqttMessageHandler messageHandler,
            IServiceScopeFactory scopeFactory,
            IOptions<MqttBrokerSettings> settings,
            ILogger<MqttHostedService> logger)
        {
            _mqttClient = mqttClient;
            _messageHandler = messageHandler;
            _scopeFactory = scopeFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("MQTT integration is disabled. Set Mqtt:Enabled=true to connect to a broker.");
                return;
            }

            var delay = TimeSpan.FromSeconds(Math.Clamp(_settings.ReconnectDelaySeconds, 1, 300));
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await _mqttClient.ConnectAndSubscribeAsync(_messageHandler.HandleAsync, stoppingToken);
                    await DispatchPendingCommandsAsync(stoppingToken);

                    var retryInterval = TimeSpan.FromSeconds(Math.Clamp(_settings.PendingCommandRetrySeconds, 5, 3600));
                    var disconnected = _mqttClient.WaitForDisconnectAsync(stoppingToken);
                    while (!stoppingToken.IsCancellationRequested)
                    {
                        using var delayCancellation = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                        var nextTick = Task.Delay(retryInterval, delayCancellation.Token);
                        var completed = await Task.WhenAny(disconnected, nextTick);
                        if (completed == disconnected)
                        {
                            delayCancellation.Cancel();
                            await disconnected;
                            break;
                        }

                        await nextTick;

                        await DispatchPendingCommandsAsync(stoppingToken);
                    }

                    if (!stoppingToken.IsCancellationRequested)
                        _logger.LogWarning("MQTT connection was lost; reconnecting after {DelaySeconds} seconds.", delay.TotalSeconds);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "MQTT connection or subscription failed; retrying after {DelaySeconds} seconds.",
                        delay.TotalSeconds);
                    try
                    {
                        await _mqttClient.DisconnectAsync(CancellationToken.None);
                    }
                    catch (Exception disconnectException)
                    {
                        _logger.LogDebug(disconnectException, "MQTT disconnect cleanup failed.");
                    }
                }

                if (stoppingToken.IsCancellationRequested)
                    break;

                try
                {
                    await Task.Delay(delay, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
            }

            await _mqttClient.DisconnectAsync(CancellationToken.None);
        }

        private async Task DispatchPendingCommandsAsync(CancellationToken cancellationToken)
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var devices = scope.ServiceProvider.GetRequiredService<IDeviceService>();
            var commands = scope.ServiceProvider.GetRequiredService<IDeviceCommandService>();
            var publisher = scope.ServiceProvider.GetRequiredService<IMqttPublisher>();
            var allDevices = await devices.GetAllAsync(cancellationToken);
            var pendingCommandIds = new HashSet<Guid>();
            var now = DateTimeOffset.UtcNow;
            var maxRetries = Math.Clamp(_settings.MaxPendingCommandRetries, 1, 20);
            var expiry = TimeSpan.FromMinutes(Math.Clamp(_settings.PendingCommandExpiryMinutes, 1, 1440));
            var baseDelay = TimeSpan.FromSeconds(Math.Clamp(_settings.PendingCommandRetrySeconds, 5, 3600));

            foreach (var device in allDevices)
            {
                var pending = await commands.GetPendingCommandsAsync(device.Id, cancellationToken);
                foreach (var command in pending)
                {
                    pendingCommandIds.Add(command.Id);
                    if (!device.IsActive || !device.IsOnline)
                        continue;

                    if (!_pendingRetries.TryGetValue(command.Id, out var retryState))
                    {
                        retryState = new PendingCommandRetryState
                        {
                            ExpiresAtUtc = command.CreatedAtUtc.Add(expiry),
                            NextAttemptAtUtc = command.CreatedAtUtc.Add(baseDelay)
                        };
                        _pendingRetries.Add(command.Id, retryState);
                    }

                    if (now >= retryState.ExpiresAtUtc)
                    {
                        if (!retryState.ExpiryLogged)
                        {
                            _logger.LogWarning("Command {CommandId} remains Pending but retry window expired; it was not marked Failed because delivery is ambiguous.",
                                command.Id);
                            retryState.ExpiryLogged = true;
                        }
                        continue;
                    }

                    if (retryState.RetryCount >= maxRetries || now < retryState.NextAttemptAtUtc)
                        continue;

                    try
                    {
                        await publisher.PublishCommandAsync(device.DeviceCode, command, cancellationToken);
                    }
                    catch (MqttPublishNotStartedException)
                    {
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

                    retryState.RetryCount++;
                    var backoffSeconds = Math.Min(baseDelay.TotalSeconds * Math.Pow(2, retryState.RetryCount), 60);
                    retryState.NextAttemptAtUtc = DateTimeOffset.UtcNow.AddSeconds(backoffSeconds);
                }
            }

            foreach (var commandId in _pendingRetries.Keys.Where(id => !pendingCommandIds.Contains(id)).ToArray())
                _pendingRetries.Remove(commandId);
        }

        private sealed class PendingCommandRetryState
        {
            public DateTimeOffset ExpiresAtUtc { get; init; }
            public DateTimeOffset NextAttemptAtUtc { get; set; }
            public int RetryCount { get; set; }
            public bool ExpiryLogged { get; set; }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await base.StopAsync(cancellationToken);
            await _mqttClient.DisconnectAsync(cancellationToken);
        }
    }
}
