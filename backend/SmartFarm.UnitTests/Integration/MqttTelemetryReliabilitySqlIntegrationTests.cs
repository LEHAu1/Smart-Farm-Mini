using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Persistence.Repositories;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.Infrastructure.Realtime;

namespace SmartFarm.UnitTests.Integration;

/// <summary>
/// SQL-backed telemetry behavior tests. They reuse the opt-in LocalDB fixture, which
/// creates a unique database per test-class run and intentionally retains it.
/// Run with SMARTFARM_SQL_LEASE_TESTS=1; never points to a shared/live database.
/// </summary>
public sealed class MqttTelemetryReliabilitySqlIntegrationTests : IClassFixture<SqlLeaseIntegrationDatabaseFixture>
{
    private readonly SqlLeaseIntegrationDatabaseFixture _fixture;

    public MqttTelemetryReliabilitySqlIntegrationTests(SqlLeaseIntegrationDatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [SqlLeaseFact]
    public async Task Handler_RedeliveredMessageIdAndSensorType_StoresOneReading()
    {
        RequireEnabled();
        var seeded = await SeedDeviceAsync();
        var messageId = Guid.NewGuid();
        var (handler, context) = CreateHandler();
        await using (context)
        {
            var topic = $"smartfarm/device/{seeded.Device.DeviceCode}/telemetry";
            var payload = CreatePayload(messageId, SensorType.AirTemperature, 28.2m, "°C");

            await handler.HandleAsync(topic, payload, CancellationToken.None);
            // Simulate QoS 1 redelivery after a lost broker/application acknowledgement.
            await handler.HandleAsync(topic, payload, CancellationToken.None);
        }

        await using var verify = CreateContext();
        var matchingRows = await verify.SensorReadings
            .CountAsync(reading => reading.MessageId == messageId &&
                                   reading.SensorType == SensorType.AirTemperature);
        Assert.Equal(1, matchingRows);

        // The idempotency key intentionally includes SensorType, so a different type
        // may share a MessageId without colliding.
        await using var otherTypeContext = CreateContext();
        var otherType = new SensorReading(
            seeded.Device.Id, SensorType.AirHumidity, 55m, "%",
            DateTimeOffset.UtcNow.AddSeconds(-1), DateTimeOffset.UtcNow, messageId);
        otherTypeContext.SensorReadings.Add(otherType);
        await otherTypeContext.SaveChangesAsync();
        Assert.Equal(2, await otherTypeContext.SensorReadings.CountAsync(reading => reading.MessageId == messageId));
    }

    [SqlLeaseFact]
    public async Task Handler_InvalidAirHumidity120_DoesNotPersistReading()
    {
        RequireEnabled();
        var seeded = await SeedDeviceAsync();
        var messageId = Guid.NewGuid();
        var (handler, context) = CreateHandler();
        await using (context)
        {
            var payload = CreatePayload(messageId, SensorType.AirHumidity, 120m, "%");
            await handler.HandleAsync(
                $"smartfarm/device/{seeded.Device.DeviceCode}/telemetry", payload, CancellationToken.None);
        }

        await using var verify = CreateContext();
        Assert.Equal(0, await verify.SensorReadings.CountAsync(reading => reading.MessageId == messageId));
    }

    [SqlLeaseFact]
    public async Task LatestReadings_OutOfOrderMessagesAndMultipleDevices_AreIsolatedAndOrderedByRecordedTime()
    {
        RequireEnabled();
        var first = await SeedDeviceAsync();
        var second = await SeedDeviceAsync(first.OwnerId);
        var recordedAt = DateTimeOffset.UtcNow.AddMinutes(-5);

        await using (var seed = CreateContext())
        {
            seed.SensorReadings.Add(new SensorReading(
                first.Device.Id, SensorType.AirTemperature, 31.6m, "°C",
                recordedAt, recordedAt.AddSeconds(1), Guid.NewGuid()));
            seed.SensorReadings.Add(new SensorReading(
                first.Device.Id, SensorType.AirTemperature, 28.2m, "°C",
                recordedAt.AddMinutes(-10), recordedAt.AddMinutes(-10).AddSeconds(1), Guid.NewGuid()));
            seed.SensorReadings.Add(new SensorReading(
                second.Device.Id, SensorType.AirTemperature, 24.5m, "°C",
                recordedAt.AddMinutes(-2), recordedAt.AddMinutes(-2).AddSeconds(1), Guid.NewGuid()));
            await seed.SaveChangesAsync();
        }

        await using var queryContext = CreateContext();
        var repository = new SensorReadingRepository(queryContext);
        var latest = await repository.GetLatestByDeviceIdsAsync(
            new[] { first.Device.Id, second.Device.Id, first.Device.Id }, countPerDevice: 5);

        Assert.Equal(3, latest.Count);
        Assert.Equal(2, latest.Count(reading => reading.DeviceId == first.Device.Id));
        Assert.Equal(1, latest.Count(reading => reading.DeviceId == second.Device.Id));
        Assert.Equal(31.6m, latest.Where(reading => reading.DeviceId == first.Device.Id)
            .OrderByDescending(reading => reading.RecordedAtUtc).First().Value);
        Assert.Equal(24.5m, latest.Single(reading => reading.DeviceId == second.Device.Id).Value);
        Assert.Equal(recordedAt, latest.Where(reading => reading.DeviceId == first.Device.Id)
            .OrderByDescending(reading => reading.RecordedAtUtc).First().RecordedAtUtc);
    }

    [SqlLeaseFact]
    public async Task DeviceRepository_StaleHeartbeat_IsMarkedOfflineWithoutChangingLastSeen()
    {
        RequireEnabled();
        var now = DateTimeOffset.UtcNow;
        var seeded = await SeedDeviceAsync(createdAtUtc: now.AddHours(-1), lastSeenAtUtc: now.AddMinutes(-10));
        var cutoff = now.AddSeconds(-90);

        await using (var update = CreateContext())
        {
            var repository = new DeviceRepository(update);
            var candidates = await repository.GetOnlineDevicesLastSeenBeforeAsync(cutoff);
            Assert.Contains(candidates, device => device.Id == seeded.Device.Id);

            var changed = await repository.MarkOnlineDevicesOfflineBeforeAsync(cutoff, now);
            Assert.True(changed >= 1);
        }

        await using var verify = CreateContext();
        var stored = await verify.Devices.SingleAsync(device => device.Id == seeded.Device.Id);
        Assert.False(stored.IsOnline);
        Assert.Equal(seeded.LastSeenAtUtc, stored.LastSeenAtUtc);
    }

    [SqlLeaseFact]
    public async Task DeviceOwnershipTransfer_ConcurrentCompareAndSwapPreservesHistoryAndAccessScope()
    {
        RequireEnabled();
        var seeded = await SeedDeviceAsync();
        var firstTarget = Guid.NewGuid();
        var secondTarget = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var reading = new SensorReading(
            seeded.Device.Id, SmartFarm.Domain.Enums.SensorType.AirTemperature, 23.5m, "°C",
            now.AddSeconds(-1), now, Guid.NewGuid());

        await using (var seed = CreateContext())
        {
            foreach (var targetId in new[] { firstTarget, secondTarget })
            {
                seed.Users.Add(new AppUser
                {
                    Id = targetId,
                    UserName = $"owner-{Guid.NewGuid():N}",
                    NormalizedUserName = $"OWNER-{Guid.NewGuid():N}",
                    Email = $"{Guid.NewGuid():N}@example.invalid",
                    NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
                    EmailConfirmed = true,
                    AuthProvider = "Local",
                    CreatedAtUtc = now.AddMinutes(-1)
                });
            }
            seed.SensorReadings.Add(reading);
            await seed.SaveChangesAsync();
        }

        await using var contextA = CreateContext();
        await using var contextB = CreateContext();
        await using var staleContext = CreateContext();
        var staleDevice = await staleContext.Devices.SingleAsync(device => device.Id == seeded.Device.Id);
        var repoA = new DeviceRepository(contextA);
        var repoB = new DeviceRepository(contextB);
        var outcomes = await Task.WhenAll(
            repoA.TryTransferOwnershipAsync(seeded.Device.Id, seeded.OwnerId, firstTarget, now),
            repoB.TryTransferOwnershipAsync(seeded.Device.Id, seeded.OwnerId, secondTarget, now));

        Assert.Single(outcomes, succeeded => succeeded);
        var winningOwner = outcomes[0] ? firstTarget : secondTarget;

        // An in-flight metadata update loaded under the old owner must not write that
        // stale OwnerId back. Repository updates now preserve EF property-level tracking.
        staleDevice.UpdateInformation("Updated during transfer", "stale request", now.AddSeconds(1));
        var staleRepository = new DeviceRepository(staleContext);
        await staleRepository.UpdateAsync(staleDevice);
        await staleRepository.SaveChangesAsync();

        await using var verify = CreateContext();
        var storedDevice = await verify.Devices.SingleAsync(device => device.Id == seeded.Device.Id);
        Assert.Equal(winningOwner, storedDevice.OwnerId);
        Assert.Equal("Updated during transfer", storedDevice.Name);
        Assert.Equal(seeded.Device.DeviceCode, storedDevice.DeviceCode);
        Assert.Equal(1, await verify.Devices.CountAsync(device => device.DeviceCode == seeded.Device.DeviceCode));
        Assert.Equal(1, await verify.SensorReadings.CountAsync(row => row.Id == reading.Id && row.DeviceId == seeded.Device.Id));

        var repository = new DeviceRepository(verify);
        Assert.DoesNotContain(await repository.GetByOwnerIdAsync(seeded.OwnerId), device => device.Id == seeded.Device.Id);
        Assert.Contains(await repository.GetByOwnerIdAsync(winningOwner), device => device.Id == seeded.Device.Id);
    }

    [SqlLeaseFact]
    public async Task DeviceRepository_OnlyConfirmedAndUnlockedAccountsAreEligibleTransferTargets()
    {
        RequireEnabled();
        var now = DateTimeOffset.UtcNow;
        var activeId = Guid.NewGuid();
        var unconfirmedId = Guid.NewGuid();
        var lockedId = Guid.NewGuid();

        await using (var seed = CreateContext())
        {
            seed.Users.AddRange(
                new AppUser
                {
                    Id = activeId, UserName = $"active-{Guid.NewGuid():N}", NormalizedUserName = $"ACTIVE-{Guid.NewGuid():N}",
                    Email = $"{Guid.NewGuid():N}@example.invalid", NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
                    EmailConfirmed = true, AuthProvider = "Local", CreatedAtUtc = now.AddMinutes(-1)
                },
                new AppUser
                {
                    Id = unconfirmedId, UserName = $"unconfirmed-{Guid.NewGuid():N}", NormalizedUserName = $"UNCONFIRMED-{Guid.NewGuid():N}",
                    Email = $"{Guid.NewGuid():N}@example.invalid", NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
                    EmailConfirmed = false, AuthProvider = "Local", CreatedAtUtc = now.AddMinutes(-1)
                },
                new AppUser
                {
                    Id = lockedId, UserName = $"locked-{Guid.NewGuid():N}", NormalizedUserName = $"LOCKED-{Guid.NewGuid():N}",
                    Email = $"{Guid.NewGuid():N}@example.invalid", NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
                    EmailConfirmed = true, LockoutEnd = now.AddMinutes(10), AuthProvider = "Local", CreatedAtUtc = now.AddMinutes(-1)
                });
            await seed.SaveChangesAsync();
        }

        await using var context = CreateContext();
        var repository = new DeviceRepository(context);
        Assert.True(await repository.IsEligibleOwnerAsync(activeId, now));
        Assert.False(await repository.IsEligibleOwnerAsync(unconfirmedId, now));
        Assert.False(await repository.IsEligibleOwnerAsync(lockedId, now));
        Assert.False(await repository.IsEligibleOwnerAsync(Guid.NewGuid(), now));
    }

    private void RequireEnabled()
    {
        if (!_fixture.Enabled || _fixture.Options is null || string.IsNullOrWhiteSpace(_fixture.DatabaseName))
        {
            throw new InvalidOperationException(
                "The SQL telemetry integration fixture was not enabled for this run.");
        }
    }

    private SmartFarmDbContext CreateContext()
    {
        RequireEnabled();
        return new SmartFarmDbContext(_fixture.Options!);
    }

    private async Task<SeededDevice> SeedDeviceAsync(
        Guid? ownerId = null,
        DateTimeOffset? createdAtUtc = null,
        DateTimeOffset? lastSeenAtUtc = null)
    {
        var userId = ownerId ?? Guid.NewGuid();
        var created = createdAtUtc ?? DateTimeOffset.UtcNow.AddMinutes(-1);
        var device = new Device(userId, $"TEL-{Guid.NewGuid():N}"[..20], "Telemetry integration test", created);
        if (lastSeenAtUtc is not null)
            device.MarkOnline(lastSeenAtUtc.Value);

        await using var context = CreateContext();
        if (!await context.Users.AnyAsync(user => user.Id == userId))
        {
            context.Users.Add(new AppUser
            {
                Id = userId,
                UserName = $"telemetry-{Guid.NewGuid():N}",
                NormalizedUserName = $"TELEMETRY-{Guid.NewGuid():N}",
                Email = $"{Guid.NewGuid():N}@example.invalid",
                NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
                EmailConfirmed = true,
                AuthProvider = "Local",
                CreatedAtUtc = created
            });
        }
        context.Devices.Add(device);
        await context.SaveChangesAsync();
        return new SeededDevice(userId, device, lastSeenAtUtc);
    }

    private (MqttMessageHandler Handler, SmartFarmDbContext Context) CreateHandler()
    {
        var context = CreateContext();
        var devices = new DeviceRepository(context);
        var readings = new SensorReadingRepository(context);
        var aggregates = new SensorReadingAggregateRepository(context);
        var sensors = new SmartFarm.Application.Services.SensorService(
            readings, aggregates, devices, NullLogger<SmartFarm.Application.Services.SensorService>.Instance);
        var notifier = new Mock<ISensorHubNotifier>();
        notifier.Setup(service => service.NotifyConnectionStatusAsync(
                It.IsAny<Guid>(), It.IsAny<SmartFarm.Application.DTOs.Device.DeviceConnectionStatusDto>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notifier.Setup(service => service.NotifyTelemetryAsync(
                It.IsAny<Guid>(), It.IsAny<SensorTelemetryDto>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var commands = new Mock<IDeviceCommandService>();
        var provider = new TestServiceProvider(new Dictionary<Type, object>
        {
            [typeof(SmartFarm.Application.Contracts.Persistence.IDeviceRepository)] = devices,
            [typeof(SmartFarm.Application.Contracts.Services.ISensorService)] = sensors,
            [typeof(ISensorHubNotifier)] = notifier.Object,
            [typeof(IDeviceCommandService)] = commands.Object
        });
        var handler = new MqttMessageHandler(
            new TestScopeFactory(provider),
            NullLogger<MqttMessageHandler>.Instance,
            new DeviceStatusSynchronization());
        return (handler, context);
    }

    private static byte[] CreatePayload(Guid messageId, SensorType sensorType, decimal value, string unit)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            messageId,
            sensorType = sensorType.ToString(),
            value,
            unit,
            recordedAtUtc = DateTimeOffset.UtcNow.AddSeconds(-1)
        });
        return System.Text.Encoding.UTF8.GetBytes(json);
    }

    private sealed record SeededDevice(Guid OwnerId, Device Device, DateTimeOffset? LastSeenAtUtc);

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
