using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Contracts.Services;
using MQTTnet;
using MQTTnet.Client;
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

            var optionsBuilder = new MqttClientOptionsBuilder()
                .WithClientId(_settings.ClientId)
                .WithTcpServer(_settings.Host, _settings.Port)
                .WithCredentials(_settings.Username, _settings.Password)
                .WithKeepAlivePeriod(TimeSpan.FromSeconds(60));

            if (_settings.UseTls)
                optionsBuilder.WithTlsOptions(tls => tls.UseTls());

            await _client.ConnectAsync(optionsBuilder.Build(), cancellationToken);

            var subscriptions = new MqttClientSubscribeOptionsBuilder()
                .WithTopicFilter(filter => filter
                    .WithTopic(MqttTopicConstants.TelemetryPattern)
                    .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce))
                .WithTopicFilter(filter => filter
                    .WithTopic(MqttTopicConstants.AcknowledgementPattern)
                    .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce))
                .Build();

            await _client.SubscribeAsync(subscriptions, cancellationToken);
            _logger.LogInformation("Connected to MQTT broker {Host}:{Port} and subscribed to telemetry and acknowledgements.",
                _settings.Host, _settings.Port);
        }

        public async Task PublishAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken cancellationToken)
        {
            if (!_settings.Enabled || !_client.IsConnected)
                throw new MqttPublishNotStartedException("MQTT broker is currently unavailable; publish was not started.");

            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payload.ToArray())
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _client.PublishAsync(message, cancellationToken);
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

            var segment = eventArgs.ApplicationMessage.PayloadSegment;
            var payload = segment.Array is null
                ? ReadOnlyMemory<byte>.Empty
                : new ReadOnlyMemory<byte>(segment.Array, segment.Offset, segment.Count);

            await handler(eventArgs.ApplicationMessage.Topic, payload, _messageCancellationToken);
        }

        private Task OnDisconnectedAsync(MqttClientDisconnectedEventArgs eventArgs)
        {
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
