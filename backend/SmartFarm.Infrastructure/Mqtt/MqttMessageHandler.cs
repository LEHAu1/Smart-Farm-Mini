using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;
using SmartFarm.Infrastructure.Realtime;

namespace SmartFarm.Infrastructure.Mqtt
{
    public sealed class MqttMessageHandler
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new JsonStringEnumConverter() }
        };

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MqttMessageHandler> _logger;
        private readonly DeviceStatusSynchronization _deviceStatusSynchronization;
        private readonly SemaphoreSlim _acknowledgementLock = new(1, 1);

        public MqttMessageHandler(
            IServiceScopeFactory scopeFactory,
            ILogger<MqttMessageHandler> logger,
            DeviceStatusSynchronization deviceStatusSynchronization)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _deviceStatusSynchronization = deviceStatusSynchronization;
        }

        public async Task HandleAsync(string topic, ReadOnlyMemory<byte> payload, CancellationToken cancellationToken)
        {
            var segments = topic.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length != 4 || $"{segments[0]}/{segments[1]}" != MqttTopicConstants.DeviceTopicPrefix ||
                string.IsNullOrWhiteSpace(segments[2]) || segments[2].Contains('+') || segments[2].Contains('#') ||
                segments[3] is not (MqttTopicConstants.TelemetrySuffix or MqttTopicConstants.AcknowledgementSuffix))
            {
                _logger.LogWarning("Ignoring unsupported MQTT topic {Topic}.", topic);
                return;
            }

            await using var scope = _scopeFactory.CreateAsyncScope();
            var devices = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
            SmartFarm.Domain.Entities.Device? device;
            var wasOnline = false;
            await _deviceStatusSynchronization.Gate.WaitAsync(cancellationToken);
            try
            {
                device = await devices.GetByCodeAsync(segments[2], cancellationToken);
                if (device is null || !device.IsActive)
                {
                    _logger.LogWarning("Ignoring MQTT message for unknown or inactive device code {DeviceCode}.", segments[2]);
                    return;
                }

                wasOnline = device.IsOnline;
                device.MarkOnline(DateTimeOffset.UtcNow);
                await devices.UpdateAsync(device, cancellationToken);
                await devices.SaveChangesAsync(cancellationToken);

                if (!wasOnline)
                {
                    await scope.ServiceProvider.GetRequiredService<ISensorHubNotifier>()
                        .NotifyConnectionStatusAsync(device.OwnerId, new()
                        {
                            DeviceId = device.Id,
                            DeviceCode = device.DeviceCode,
                            Name = device.Name,
                            IsOnline = true,
                            LastSeenAtUtc = device.LastSeenAtUtc
                        }, cancellationToken);
                }
            }
            finally
            {
                _deviceStatusSynchronization.Gate.Release();
            }

            if (device is null)
                return;

            if (segments[3] == MqttTopicConstants.TelemetrySuffix)
                await HandleTelemetryAsync(scope.ServiceProvider, device.Id, device.OwnerId, payload, cancellationToken);
            else
                await HandleAcknowledgementAsync(scope.ServiceProvider, device.Id, device.OwnerId, payload, cancellationToken);
        }

        private async Task HandleTelemetryAsync(
            IServiceProvider services,
            Guid deviceId,
            Guid ownerId,
            ReadOnlyMemory<byte> payload,
            CancellationToken cancellationToken)
        {
            TelemetryMessage? message;
            try
            {
                message = JsonSerializer.Deserialize<TelemetryMessage>(payload.Span, JsonOptions);
            }
            catch (JsonException exception)
            {
                _logger.LogWarning(exception, "Ignoring malformed telemetry payload for device {DeviceId}.", deviceId);
                return;
            }

            if (message is null || message.MessageId == Guid.Empty || !Enum.IsDefined(message.SensorType) ||
                string.IsNullOrWhiteSpace(message.Unit))
            {
                _logger.LogWarning("Ignoring incomplete telemetry payload for device {DeviceId}.", deviceId);
                return;
            }

            var sensors = services.GetRequiredService<ISensorService>();
            try
            {
                await sensors.RecordReadingAsync(new CreateSensorReadingRequest
                {
                    DeviceId = deviceId,
                    MessageId = message.MessageId,
                    SensorType = message.SensorType,
                    Value = message.Value,
                    Unit = message.Unit,
                    RecordedAtUtc = message.RecordedAtUtc?.ToUniversalTime()
                }, cancellationToken);

                var telemetry = await sensors.GetCurrentTelemetryAsync(deviceId, cancellationToken);
                await services.GetRequiredService<ISensorHubNotifier>()
                    .NotifyTelemetryAsync(ownerId, telemetry, cancellationToken);
            }
            catch (ArgumentException exception)
            {
                _logger.LogWarning(exception, "Ignoring invalid telemetry for device {DeviceId}.", deviceId);
            }
            catch (DomainException exception)
            {
                _logger.LogWarning(exception, "Ignoring invalid telemetry for device {DeviceId}.", deviceId);
            }
            catch (DbUpdateException exception)
            {
                if (IsDuplicateMessageId(exception))
                {
                    // The filtered MessageId index makes redelivered QoS 1 messages idempotent.
                    _logger.LogInformation("Ignoring duplicate telemetry message {MessageId} for device {DeviceId}.",
                        message.MessageId, deviceId);
                    return;
                }

                _logger.LogError(exception, "Database failure while saving telemetry message {MessageId} for device {DeviceId}.",
                    message.MessageId, deviceId);
                throw;
            }
        }

        private async Task HandleAcknowledgementAsync(
            IServiceProvider services,
            Guid deviceId,
            Guid ownerId,
            ReadOnlyMemory<byte> payload,
            CancellationToken cancellationToken)
        {
            await _acknowledgementLock.WaitAsync(cancellationToken);
            try
            {
                await ProcessAcknowledgementAsync(services, deviceId, ownerId, payload, cancellationToken);
            }
            finally
            {
                _acknowledgementLock.Release();
            }
        }

        private async Task ProcessAcknowledgementAsync(
            IServiceProvider services,
            Guid deviceId,
            Guid ownerId,
            ReadOnlyMemory<byte> payload,
            CancellationToken cancellationToken)
        {
            AcknowledgementMessage? message;
            try
            {
                message = JsonSerializer.Deserialize<AcknowledgementMessage>(payload.Span, JsonOptions);
            }
            catch (JsonException exception)
            {
                _logger.LogWarning(exception, "Ignoring malformed command acknowledgement for device {DeviceId}.", deviceId);
                return;
            }

            if (message is null || message.CommandId == Guid.Empty ||
                !Enum.TryParse<CommandStatus>(message.Status, true, out var status) ||
                status is not (CommandStatus.Acknowledged or CommandStatus.Completed or CommandStatus.Failed))
            {
                _logger.LogWarning("Ignoring incomplete command acknowledgement for device {DeviceId}.", deviceId);
                return;
            }

            var commands = services.GetRequiredService<IDeviceCommandService>();
            var existing = await commands.GetByIdAsync(message.CommandId, cancellationToken);
            if (existing is null || existing.DeviceId != deviceId)
            {
                _logger.LogWarning("Ignoring acknowledgement for unknown command {CommandId} on device {DeviceId}.",
                    message.CommandId, deviceId);
                return;
            }

            DeviceCommandDto updated;
            try
            {
                if (status == CommandStatus.Failed)
                {
                    if (existing.Status is CommandStatus.Completed or CommandStatus.Failed)
                        return;

                    updated = await commands.FailCommandAsync(message.CommandId,
                        string.IsNullOrWhiteSpace(message.ErrorMessage) ? "Thiết bị báo lệnh thất bại." : message.ErrorMessage,
                        cancellationToken);
                }
                else if (status == CommandStatus.Acknowledged)
                {
                    if (existing.Status != CommandStatus.Pending)
                        return;
                    updated = await commands.AcknowledgeCommandAsync(message.CommandId, cancellationToken);
                }
                else
                {
                    if (existing.Status == CommandStatus.Pending)
                        await commands.AcknowledgeCommandAsync(message.CommandId, cancellationToken);
                    else if (existing.Status != CommandStatus.Acknowledged)
                        return;

                    updated = await commands.CompleteCommandAsync(message.CommandId, cancellationToken);
                }
            }
            catch (InvalidOperationException exception)
            {
                _logger.LogWarning(exception, "Ignoring out-of-order acknowledgement for command {CommandId}.", message.CommandId);
                return;
            }

            await services.GetRequiredService<ISensorHubNotifier>()
                .NotifyCommandStatusAsync(ownerId, updated, cancellationToken);
        }

        private static bool IsDuplicateMessageId(DbUpdateException exception)
        {
            if (exception.GetBaseException() is not SqlException sqlException ||
                sqlException.Number is not (2601 or 2627))
                return false;

            return sqlException.Message.Contains(
                "IX_SensorReadings_MessageId_SensorType",
                StringComparison.OrdinalIgnoreCase);
        }

        public sealed record TelemetryMessage(
            Guid MessageId,
            SensorType SensorType,
            decimal Value,
            string Unit,
            DateTimeOffset? RecordedAtUtc);

        public sealed record AcknowledgementMessage(Guid CommandId, string Status, string? ErrorMessage);
    }
}
