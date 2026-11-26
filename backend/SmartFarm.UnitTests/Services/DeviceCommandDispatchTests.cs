using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;

namespace SmartFarm.UnitTests.Services;

public sealed class DeviceCommandDispatchTests
{
    [Fact]
    public async Task CreateCommandAsync_PersistsPendingCommandWithoutPublishing()
    {
        var device = CreateOnlineDevice();
        var commands = new Mock<IDeviceCommandRepository>();
        var devices = new Mock<IDeviceRepository>();
        DeviceCommand? stored = null;

        devices.Setup(repository => repository.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(device);
        commands.Setup(repository => repository.AddAsync(It.IsAny<DeviceCommand>(), It.IsAny<CancellationToken>()))
            .Callback<DeviceCommand, CancellationToken>((command, _) => stored = command)
            .Returns(Task.CompletedTask);

        var service = new DeviceCommandService(commands.Object, devices.Object,
            new DeviceCommandQueueOptions { PendingCommandExpiryMinutes = 10 },
            NullLogger<DeviceCommandService>.Instance);

        var result = await service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = device.Id,
            Action = "START_PUMP",
            Payload = "{\"durationSeconds\":10}"
        });

        Assert.Equal("START_PUMP", result.Action);
        Assert.Equal("Pending", result.StatusName);
        Assert.Equal(result.Id, stored?.Id);
        Assert.Equal(SmartFarm.Domain.Enums.CommandStatus.Pending, stored?.Status);
        Assert.True(result.ExpiresAtUtc > result.CreatedAtUtc);
        commands.Verify(repository => repository.AddAsync(It.IsAny<DeviceCommand>(), It.IsAny<CancellationToken>()), Times.Once);
        commands.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCommandAsync_RejectsUnknownActionBeforePersistence()
    {
        var commands = new Mock<IDeviceCommandRepository>();
        var service = new DeviceCommandService(commands.Object,
            Mock.Of<IDeviceRepository>(), new DeviceCommandQueueOptions(),
            NullLogger<DeviceCommandService>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = Guid.NewGuid(),
            Action = "UNSAFE_RAW_COMMAND"
        }));

        commands.Verify(repository => repository.AddAsync(It.IsAny<DeviceCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Device CreateOnlineDevice()
    {
        var now = DateTimeOffset.UtcNow;
        var device = new Device(Guid.NewGuid(), "ESP32_TEST-01", "Test device", now);
        device.MarkOnline(now);
        return device;
    }
}
