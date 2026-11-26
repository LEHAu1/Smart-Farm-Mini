using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Infrastructure.Mqtt;

namespace SmartFarm.WebAPI.BackgroundServices
{
    public sealed class MqttHostedService : BackgroundService
    {
        private readonly MqttClientService _mqttClient;
        private readonly MqttMessageHandler _messageHandler;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly PendingCommandDispatcher _pendingCommandDispatcher;
        private readonly MqttBrokerSettings _settings;
        private readonly ILogger<MqttHostedService> _logger;

        public MqttHostedService(
            MqttClientService mqttClient,
            MqttMessageHandler messageHandler,
            IServiceScopeFactory scopeFactory,
            PendingCommandDispatcher pendingCommandDispatcher,
            IOptions<MqttBrokerSettings> settings,
            ILogger<MqttHostedService> logger)
        {
            _mqttClient = mqttClient;
            _messageHandler = messageHandler;
            _scopeFactory = scopeFactory;
            _pendingCommandDispatcher = pendingCommandDispatcher;
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
                    if (_settings.CommandDispatchEnabled)
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

                        if (_settings.CommandDispatchEnabled)
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
            await _pendingCommandDispatcher.DispatchAsync(devices, commands, publisher, cancellationToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await base.StopAsync(cancellationToken);
            await _mqttClient.DisconnectAsync(cancellationToken);
        }
    }
}
