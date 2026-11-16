using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.Infrastructure.Realtime;

namespace SmartFarm.UnitTests.Services;

public sealed class MqttMessageHandlerTests
{
    [Fact]
    public async Task TelemetryMessage_IsStoredAndBroadcastToOwningUser()
    {
        var ownerId = Guid.NewGuid();
        var device = CreateDevice(ownerId);
        var (handler, devices, sensors, notifier, _) = CreateHandler(device);
        var messageId = Guid.NewGuid();
        var payload = $$"""{"messageId":"{{messageId}}","sensorType":"SoilMoisture","value":44.5,"unit":"%","recordedAtUtc":"2026-11-13T08:30:00Z"}""";

        await handler.HandleAsync($"smartfarm/device/{device.DeviceCode}/telemetry",
            System.Text.Encoding.UTF8.GetBytes(payload), CancellationToken.None);

        devices.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        sensors.Verify(service => service.RecordReadingAsync(It.Is<CreateSensorReadingRequest>(request =>
            request.DeviceId == device.Id && request.MessageId == messageId &&
            request.SensorType == SensorType.SoilMoisture && request.Value == 44.5m && request.Unit == "%"),
            It.IsAny<CancellationToken>()), Times.Once);
        notifier.Verify(service => service.NotifyTelemetryAsync(ownerId,
            It.IsAny<SensorTelemetryDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DuplicateConcurrentAcknowledgement_IsAppliedOnce()
    {
        var device = CreateDevice(Guid.NewGuid());
        var (handler, _, _, _, commands) = CreateHandler(device);
        var commandId = Guid.NewGuid();
        var currentStatus = CommandStatus.Pending;
        commands.Setup(service => service.GetByIdAsync(commandId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new DeviceCommandDto
            {
                Id = commandId,
                DeviceId = device.Id,
                Status = currentStatus
            });
        commands.Setup(service => service.AcknowledgeCommandAsync(commandId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                currentStatus = CommandStatus.Acknowledged;
                return new DeviceCommandDto { Id = commandId, DeviceId = device.Id, Status = currentStatus };
            });

        var payload = $$"""{"commandId":"{{commandId}}","status":"Acknowledged"}""";
        var bytes = System.Text.Encoding.UTF8.GetBytes(payload);
        var topic = $"smartfarm/device/{device.DeviceCode}/ack";

        await Task.WhenAll(
            handler.HandleAsync(topic, bytes, CancellationToken.None),
            handler.HandleAsync(topic, bytes, CancellationToken.None));

        commands.Verify(service => service.AcknowledgeCommandAsync(commandId, It.IsAny<CancellationToken>()), Times.Once);
        commands.Verify(service => service.CompleteCommandAsync(commandId, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AcknowledgementForDifferentDevice_IsIgnored()
    {
        var device = CreateDevice(Guid.NewGuid());
        var (handler, _, _, _, commands) = CreateHandler(device);
        var commandId = Guid.NewGuid();
        commands.Setup(service => service.GetByIdAsync(commandId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeviceCommandDto
            {
                Id = commandId,
                DeviceId = Guid.NewGuid(),
                Status = CommandStatus.Pending
            });

        var payload = $$"""{"commandId":"{{commandId}}","status":"Completed"}""";
        await handler.HandleAsync($"smartfarm/device/{device.DeviceCode}/ack",
            System.Text.Encoding.UTF8.GetBytes(payload), CancellationToken.None);

        commands.Verify(service => service.AcknowledgeCommandAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        commands.Verify(service => service.CompleteCommandAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static (MqttMessageHandler Handler,
        Mock<IDeviceRepository> Devices,
        Mock<ISensorService> Sensors,
        Mock<ISensorHubNotifier> Notifier,
        Mock<IDeviceCommandService> Commands) CreateHandler(Device device)
    {
        var devices = new Mock<IDeviceRepository>();
        var sensors = new Mock<ISensorService>();
        var notifier = new Mock<ISensorHubNotifier>();
        var commands = new Mock<IDeviceCommandService>();

        devices.Setup(repository => repository.GetByCodeAsync(device.DeviceCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);
        devices.Setup(repository => repository.UpdateAsync(device, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        devices.Setup(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        sensors.Setup(service => service.RecordReadingAsync(It.IsAny<CreateSensorReadingRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SensorReadingDto());
        sensors.Setup(service => service.GetCurrentTelemetryAsync(device.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SensorTelemetryDto { DeviceId = device.Id });
        notifier.Setup(service => service.NotifyConnectionStatusAsync(device.OwnerId,
                It.IsAny<SmartFarm.Application.DTOs.Device.DeviceConnectionStatusDto>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notifier.Setup(service => service.NotifyTelemetryAsync(device.OwnerId,
                It.IsAny<SensorTelemetryDto>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notifier.Setup(service => service.NotifyCommandStatusAsync(device.OwnerId,
                It.IsAny<DeviceCommandDto>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var provider = new TestServiceProvider(new Dictionary<Type, object>
        {
            [typeof(IDeviceRepository)] = devices.Object,
            [typeof(ISensorService)] = sensors.Object,
            [typeof(ISensorHubNotifier)] = notifier.Object,
            [typeof(IDeviceCommandService)] = commands.Object
        });
        var scopeFactory = new TestScopeFactory(provider);
        var handler = new MqttMessageHandler(scopeFactory, NullLogger<MqttMessageHandler>.Instance,
            new DeviceStatusSynchronization());
        return (handler, devices, sensors, notifier, commands);
    }

    private static Device CreateDevice(Guid ownerId) =>
        new(ownerId, "ESP32_TEST-01", "Test device", DateTimeOffset.UtcNow);

    private sealed class TestServiceProvider(IReadOnlyDictionary<Type, object> services) : IServiceProvider
    {
        public object? GetService(Type serviceType) => services.GetValueOrDefault(serviceType);
    }

    private sealed class TestScopeFactory(IServiceProvider serviceProvider) : IServiceScopeFactory
    {
        public IServiceScope CreateScope() => new TestScope(serviceProvider);
    }

    private sealed class TestScope(IServiceProvider serviceProvider) : IServiceScope, IAsyncDisposable
    {
        public IServiceProvider ServiceProvider { get; } = serviceProvider;
        public void Dispose() { }
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
