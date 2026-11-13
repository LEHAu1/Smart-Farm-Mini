using System.Text.Json;
using System.Text.RegularExpressions;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;

namespace SmartFarm.Infrastructure.Mqtt
{
    public sealed class MqttPublisher : IMqttPublisher
    {
        private static readonly Regex DeviceCodePattern = new("^[A-Za-z0-9_-]{1,50}$", RegexOptions.Compiled);
        private readonly MqttClientService _client;

        public MqttPublisher(MqttClientService client)
        {
            _client = client;
        }

        public Task PublishCommandAsync(
            string deviceCode,
            DeviceCommandDto command,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(command);
            if (!DeviceCodePattern.IsMatch(deviceCode))
                throw new MqttPublishNotStartedException("Device code is not valid for an MQTT topic segment; publish was not started.");

            var payload = JsonSerializer.SerializeToUtf8Bytes(new
            {
                commandId = command.Id,
                commandCode = command.CommandCode,
                action = command.Action,
                payload = command.Payload,
                createdAtUtc = command.CreatedAtUtc
            });

            return _client.PublishAsync(
                string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    MqttTopicConstants.CommandPattern, deviceCode),
                payload,
                cancellationToken);
        }
    }
}
