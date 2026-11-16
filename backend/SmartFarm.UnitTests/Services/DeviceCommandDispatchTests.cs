using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;

namespace SmartFarm.UnitTests.Services;

public sealed class DeviceCommandDispatchTests
{
    [Fact]
    public async Task CreateCommandAsync_PersistsAndPublishesCommand()
    {
        var device = CreateOnlineDevice();
        var commands = new Mock<IDeviceCommandRepository>();
        var devices = new Mock<IDeviceRepository>();
        var publisher = new Mock<IMqttPublisher>();

        devices.Setup(repository => repository.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);

        var service = new DeviceCommandService(commands.Object, devices.Object, publisher.Object,
            NullLogger<DeviceCommandService>.Instance);

        var result = await service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = device.Id,
            Action = "START_PUMP",
            Payload = "{\"durationSeconds\":10}"
        });

        Assert.Equal("START_PUMP", result.Action);
        Assert.Equal("Pending", result.StatusName);
        commands.Verify(repository => repository.AddAsync(It.Is<DeviceCommand>(
            command => command.Id == result.Id), It.IsAny<CancellationToken>()), Times.Once);
        publisher.Verify(client => client.PublishCommandAsync(device.DeviceCode,
            It.Is<DeviceCommandDto>(command => command.Id == result.Id), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCommandAsync_WhenBrokerUnavailable_MarksCommandFailed()
    {
        var device = CreateOnlineDevice();
        var commands = new Mock<IDeviceCommandRepository>();
        var devices = new Mock<IDeviceRepository>();
        var publisher = new Mock<IMqttPublisher>();
        DeviceCommand? stored = null;

        devices.Setup(repository => repository.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);
        commands.Setup(repository => repository.AddAsync(It.IsAny<DeviceCommand>(), It.IsAny<CancellationToken>()))
            .Callback<DeviceCommand, CancellationToken>((command, _) => stored = command)
            .Returns(Task.CompletedTask);
        publisher.Setup(client => client.PublishCommandAsync(
                It.IsAny<string>(), It.IsAny<DeviceCommandDto>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new MqttPublishNotStartedException("Broker unavailable before publish"));

        var service = new DeviceCommandService(commands.Object, devices.Object, publisher.Object,
            NullLogger<DeviceCommandService>.Instance);

        var result = await service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = device.Id,
            Action = "STOP_PUMP"
        });

        Assert.Equal("Failed", result.StatusName);
        Assert.Contains("không thể gửi", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        Assert.NotNull(stored);
        Assert.Equal(SmartFarm.Domain.Enums.CommandStatus.Failed, stored.Status);
        commands.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task CreateCommandAsync_WhenPublishOutcomeIsAmbiguous_LeavesCommandPendingForRetry()
    {
        var device = CreateOnlineDevice();
        var commands = new Mock<IDeviceCommandRepository>();
        var devices = new Mock<IDeviceRepository>();
        var publisher = new Mock<IMqttPublisher>();
        DeviceCommand? stored = null;

        devices.Setup(repository => repository.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);
        commands.Setup(repository => repository.AddAsync(It.IsAny<DeviceCommand>(), It.IsAny<CancellationToken>()))
            .Callback<DeviceCommand, CancellationToken>((command, _) => stored = command)
            .Returns(Task.CompletedTask);
        publisher.Setup(client => client.PublishCommandAsync(
                It.IsAny<string>(), It.IsAny<DeviceCommandDto>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("PUBACK timed out after publish started"));

        var service = new DeviceCommandService(commands.Object, devices.Object, publisher.Object,
            NullLogger<DeviceCommandService>.Instance);

        var result = await service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = device.Id,
            Action = "STOP_PUMP"
        });

        Assert.Equal("Pending", result.StatusName);
        Assert.NotNull(stored);
        Assert.Equal(SmartFarm.Domain.Enums.CommandStatus.Pending, stored.Status);
        commands.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCommandAsync_RejectsUnknownAction()
    {
        var service = new DeviceCommandService(
            Mock.Of<IDeviceCommandRepository>(),
            Mock.Of<IDeviceRepository>(),
            Mock.Of<IMqttPublisher>(),
            NullLogger<DeviceCommandService>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = Guid.NewGuid(),
            Action = "UNSAFE_RAW_COMMAND"
        }));
    }

    private static Device CreateOnlineDevice()
    {
        var device = new Device(Guid.NewGuid(), "ESP32_TEST-01", "Test device", DateTimeOffset.UtcNow);
        device.MarkOnline(DateTimeOffset.UtcNow.AddMilliseconds(1));
        return device;
    }
}
