using System.Buffers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Contracts.Services;
using MQTTnet;
using MQTTnet.Protocol;

namespace SmartFarm.Infrastructure.Mqtt
{
    public sealed class MqttClientService : IDisposable
    {
        private readonly IMqttClient _client;
        private readonly MqttBrokerSettings _settings;
        private readonly ILogger<MqttClientService> _logger;
        private Func<string, ReadOnlyMemory<byte>, CancellationToken, Task>? _messageHandler;
        private CancellationToken _messageCancellationToken;
        private TaskCompletionSource _disconnected = CompletedSignal();
        private volatile bool _telemetrySubscriptionGranted;
        private string? _telemetrySubscriptionResult;

        public MqttClientService(
            IOptions<MqttBrokerSettings> settings,
            ILogger<MqttClientService> logger)
        {
            _settings = settings.Value;
            _logger = logger;
            _client = new MqttClientFactory().CreateMqttClient();
            _client.ApplicationMessageReceivedAsync += OnMessageReceivedAsync;
            _client.DisconnectedAsync += OnDisconnectedAsync;
        }

        public bool IsEnabled => _settings.Enabled;
        public bool IsConnected => _client.IsConnected;
        public bool IsTelemetrySubscriptionGranted => _telemetrySubscriptionGranted;
        public string? TelemetrySubscriptionResult => _telemetrySubscriptionResult;

        public async Task ConnectAndSubscribeAsync(
            Func<string, ReadOnlyMemory<byte>, CancellationToken, Task> messageHandler,
            CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(messageHandler);
            _messageHandler = messageHandler;
            _messageCancellationToken = cancellationToken;

            if (!_settings.Enabled)
                return;

            if (string.IsNullOrWhiteSpace(_settings.Host) || _settings.Port is < 1 or > 65535)
                throw new InvalidOperationException("MQTT host and port configuration is invalid.");

            if (string.IsNullOrWhiteSpace(_settings.Username) || string.IsNullOrWhiteSpace(_settings.Password))
                throw new InvalidOperationException("MQTT requires broker credentials when enabled.");

            _disconnected = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            _telemetrySubscriptionGranted = false;
            _telemetrySubscriptionResult = null;

            var optionsBuilder = new MqttClientOptionsBuilder()
                .WithClientId(_settings.ClientId)
                .WithTcpServer(_settings.Host, _settings.Port)
                .WithCredentials(_settings.Username, _settings.Password)
                .WithKeepAlivePeriod(TimeSpan.FromSeconds(60));

            if (_settings.UseTls)
                optionsBuilder.WithTlsOptions(tls => tls.UseTls());

            await _client.ConnectAsync(optionsBuilder.Build(), cancellationToken);

            var configuredFilters = new[]
            {
                _settings.TelemetryTopicFilter,
                _settings.AcknowledgementTopicFilter
            }.Where(filter => !string.IsNullOrWhiteSpace(filter)).ToArray();
            if (configuredFilters.Length == 0)
                throw new InvalidOperationException("MQTT requires at least one configured subscription topic filter.");

            var subscriptionsBuilder = new MqttClientSubscribeOptionsBuilder();
            foreach (var topicFilter in configuredFilters)
            {
                subscriptionsBuilder.WithTopicFilter(filter => filter
                    .WithTopic(topicFilter)
                    .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce));
            }

            var subscriptions = subscriptionsBuilder.Build();

            var subscribeResult = await _client.SubscribeAsync(subscriptions, cancellationToken);
            foreach (var item in subscribeResult.Items)
            {
                _logger.LogInformation("MQTT SUBACK for {TopicFilter}: {ResultCode}.",
                    item.TopicFilter.Topic, item.ResultCode);

                if (string.Equals(item.TopicFilter.Topic, _settings.TelemetryTopicFilter, StringComparison.Ordinal))
                {
                    _telemetrySubscriptionResult = item.ResultCode.ToString();
                    _telemetrySubscriptionGranted = item.ResultCode is
                        MqttClientSubscribeResultCode.GrantedQoS0 or
                        MqttClientSubscribeResultCode.GrantedQoS1;
                }
            }

            if (!_telemetrySubscriptionGranted)
                throw new InvalidOperationException("MQTT broker did not grant the configured telemetry subscription.");

            _logger.LogInformation("Connected to MQTT broker {Host}:{Port}; telemetry subscription granted.",
                _settings.Host, _settings.Port);
        }

        public async Task PublishAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken cancellationToken)
        {
            if (!_settings.CommandDispatchEnabled && IsCommandTopic(topic))
                throw new MqttPublishNotStartedException("MQTT command dispatch is disabled; command publish was not started.");

            if (!_settings.Enabled || !_client.IsConnected)
                throw new MqttPublishNotStartedException("MQTT broker is currently unavailable; publish was not started.");

            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payload.ToArray())
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _client.PublishAsync(message, cancellationToken);
        }

        private static bool IsCommandTopic(string topic)
        {
            var segments = topic.Split('/');
            return segments.Length == 4
                && segments[0] == "smartfarm"
                && segments[1] == "device"
                && !string.IsNullOrWhiteSpace(segments[2])
                && segments[3] == MqttTopicConstants.CommandSuffix;
        }

        public async Task WaitForDisconnectAsync(CancellationToken cancellationToken)
        {
            await _disconnected.Task.WaitAsync(cancellationToken);
        }

        public async Task DisconnectAsync(CancellationToken cancellationToken)
        {
            if (_client.IsConnected)
                await _client.DisconnectAsync(cancellationToken: cancellationToken);
        }

        private async Task OnMessageReceivedAsync(MqttApplicationMessageReceivedEventArgs eventArgs)
        {
            var handler = _messageHandler;
            if (handler is null)
                return;

            var payload = new ReadOnlyMemory<byte>(eventArgs.ApplicationMessage.Payload.ToArray());

            await handler(eventArgs.ApplicationMessage.Topic, payload, _messageCancellationToken);
        }

        private Task OnDisconnectedAsync(MqttClientDisconnectedEventArgs eventArgs)
        {
            _telemetrySubscriptionGranted = false;
            _disconnected.TrySetResult();
            _logger.LogWarning("MQTT broker disconnected the Web API client. Reason: {Reason}", eventArgs.ReasonString);
            return Task.CompletedTask;
        }

        private static TaskCompletionSource CompletedSignal()
        {
            var signal = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            signal.SetResult();
            return signal;
        }

        public void Dispose()
        {
            _client.ApplicationMessageReceivedAsync -= OnMessageReceivedAsync;
            _client.DisconnectedAsync -= OnDisconnectedAsync;
            _client.Dispose();
        }
    }
}
