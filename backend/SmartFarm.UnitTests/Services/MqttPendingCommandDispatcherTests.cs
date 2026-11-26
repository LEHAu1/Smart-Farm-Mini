using System.Collections.Concurrent;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.WebAPI.BackgroundServices;

namespace SmartFarm.UnitTests.Services;

/// <summary>
/// These tests use an in-memory atomic lease fake and a recording publisher. They do not
/// exercise SQL Server locking or connect to an MQTT broker; those require separate integration evidence.
/// </summary>
public sealed class MqttPendingCommandDispatcherTests
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan OfflineAfter = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan CommandLifetime = TimeSpan.FromMinutes(1);

    [Fact]
    public async Task DispatchAsync_OfflineDevice_DoesNotClaimOrPublish()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: false);
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddSeconds(40));
        var harness = CreateHarness(now, device, [command]);

        await Dispatch(harness);

        Assert.Empty(harness.Publisher.Published);
        Assert.Equal(0, harness.Leases.AttemptsFor(command.Id));
        Assert.Equal(CommandStatus.Pending, command.Status);
    }

    [Fact]
    public async Task DispatchAsync_StaleHeartbeat_DoesNotClaimOrPublish()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.Subtract(OfflineAfter).AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddSeconds(40));
        var harness = CreateHarness(now, device, [command]);

        await Dispatch(harness);

        Assert.Empty(harness.Publisher.Published);
        Assert.Equal(0, harness.Leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_FreshOnlineDevice_ClaimsThenPublishesOnce()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-5));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddSeconds(40));
        var harness = CreateHarness(now, device, [command]);

        await Dispatch(harness);

        var published = Assert.Single(harness.Publisher.Published);
        Assert.Equal(device.DeviceCode, published.DeviceCode);
        Assert.Equal(command.Id, published.Command.Id);
        Assert.Equal(1, harness.Leases.AttemptsFor(command.Id));
        Assert.Equal(CommandStatus.Pending, command.Status);
    }

    [Fact]
    public async Task DispatchAsync_TelemetryOnly_DoesNotQueryCommandsClaimOrPublish()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddSeconds(40));
        var harness = CreateHarness(now, device, [command], commandDispatchEnabled: false);

        await Dispatch(harness);

        harness.Devices.Verify(service => service.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never);
        harness.Commands.Verify(service => service.GetPendingCommandsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        harness.Commands.Verify(service => service.TryAcquireDispatchLeaseAsync(
            It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(),
            It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(harness.Publisher.Published);
        Assert.Equal(CommandStatus.Pending, command.Status);
    }

    [Fact]
    public async Task DispatchAsync_ExpiredCommand_IsNeverPublishedAfterReconnect()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: false);
        var command = CreatePendingCommand(device.Id, now.AddMinutes(-2), now.AddSeconds(-1));
        var harness = CreateHarness(now, device, [command]);

        await Dispatch(harness);
        device.IsOnline = true;
        harness.Clock.Advance(TimeSpan.FromSeconds(10));
        device.LastSeenAtUtc = harness.Clock.GetUtcNow();
        await Dispatch(harness);

        Assert.Empty(harness.Publisher.Published);
        Assert.Equal(0, harness.Leases.AttemptsFor(command.Id));
        Assert.Equal(CommandStatus.Pending, command.Status);
    }

    [Fact]
    public async Task DispatchAsync_CompetingInstances_AtomicLeaseAllowsOnePublisher()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddSeconds(40));
        var leases = new FakeAtomicLeaseStore();
        var clock = new MutableTimeProvider(now);
        var pendingBarrier = new TwoReaderBarrier([command]);
        var first = CreateHarness(clock, device, [command], leases, pendingReader: pendingBarrier.ReadAsync);
        var second = CreateHarness(clock, device, [command], leases, pendingReader: pendingBarrier.ReadAsync);

        await Task.WhenAll(Dispatch(first), Dispatch(second));

        Assert.Single(first.Publisher.Published.Concat(second.Publisher.Published));
        Assert.Equal(1, leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_ReconnectTick_DoesNotRepublishWhileLeaseIsActive()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddMinutes(1));
        var harness = CreateHarness(now, device, [command]);

        await Dispatch(harness); // initial connection
        harness.Clock.Advance(TimeSpan.FromSeconds(4));
        await Dispatch(harness); // reconnect/early retry tick

        Assert.Single(harness.Publisher.Published);
        Assert.Equal(1, harness.Leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_DelayedAcknowledgementRemovesCommandFromPendingQueue()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddMinutes(1));
        var pending = new List<DeviceCommandDto> { command };
        var harness = CreateHarness(now, device, pending);

        await Dispatch(harness); // first publish; acknowledgement is delayed
        Assert.Single(harness.Publisher.Published);

        pending.Clear(); // fake repository now reflects the late ACK transition
        harness.Clock.Advance(RetryDelay);
        await Dispatch(harness);

        Assert.Single(harness.Publisher.Published);
        Assert.Equal(1, harness.Leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_AmbiguousPublish_LeaseSurvivesAndRetryReusesStableCommandId()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddMinutes(1));
        var leases = new FakeAtomicLeaseStore();
        var clock = new MutableTimeProvider(now);
        var publisher = new AmbiguousFirstPublisher();
        var harness = CreateHarness(clock, device, [command], leases, publisher);

        await Dispatch(harness); // packet may have reached the device, ACK got lost
        Assert.Single(publisher.PublishAttempts);
        Assert.Equal(1, leases.AttemptsFor(command.Id));

        var restartedDispatcher = CreateHarness(clock, device, [command], leases);
        await Dispatch(restartedDispatcher);
        Assert.Empty(restartedDispatcher.Publisher.Published); // lease survives process restart

        clock.Advance(RetryDelay); // base retry lease expires at +5s
        await Dispatch(restartedDispatcher);
        Assert.Equal(command.Id, Assert.Single(restartedDispatcher.Publisher.Published).Command.Id);
        Assert.Equal(2, leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_PublishDefinitelyNotStarted_ReleasesLeaseForNextTick()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddMinutes(1));
        var leases = new FakeAtomicLeaseStore();
        var clock = new MutableTimeProvider(now);
        var publisher = new NotStartedFirstPublisher();
        var first = CreateHarness(clock, device, [command], leases, publisher);

        await Dispatch(first);
        Assert.Equal(0, leases.AttemptsFor(command.Id));

        var retry = CreateHarness(clock, device, [command], leases);
        await Dispatch(retry);
        Assert.Single(retry.Publisher.Published);
        Assert.Equal(1, leases.AttemptsFor(command.Id));
    }

    [Fact]
    public async Task DispatchAsync_ProcessCrashAfterClaim_LeaseExpiryAllowsRecovery()
    {
        var now = Utc("2026-11-25T10:00:00Z");
        var device = CreateDevice(now, isOnline: true, lastSeen: now.AddSeconds(-1));
        var command = CreatePendingCommand(device.Id, now.AddSeconds(-20), now.AddMinutes(1));
        var leases = new FakeAtomicLeaseStore();
        var clock = new MutableTimeProvider(now);
        var interrupted = CreateHarness(clock, device, [command], leases, new AmbiguousFirstPublisher());

        await Dispatch(interrupted);
        var restarted = CreateHarness(clock, device, [command], leases);
        await Dispatch(restarted);
        Assert.Empty(restarted.Publisher.Published);

        clock.Advance(TimeSpan.FromSeconds(5));
        await Dispatch(restarted);
        Assert.Single(restarted.Publisher.Published);
    }

    private static Task Dispatch(Harness harness) => harness.Dispatcher.DispatchAsync(
        harness.Devices.Object, harness.Commands.Object, harness.Publisher, CancellationToken.None);

    private static Harness CreateHarness(
        DateTimeOffset now,
        DeviceDto device,
        IReadOnlyList<DeviceCommandDto> commands,
        FakeAtomicLeaseStore? leases = null,
        RecordingPublisher? publisher = null,
        Func<Task<IReadOnlyList<DeviceCommandDto>>>? pendingReader = null,
        bool commandDispatchEnabled = true) =>
        CreateHarness(new MutableTimeProvider(now), device, commands, leases ?? new FakeAtomicLeaseStore(), publisher, pendingReader,
            commandDispatchEnabled);

    private static Harness CreateHarness(
        MutableTimeProvider clock,
        DeviceDto device,
        IReadOnlyList<DeviceCommandDto> commands,
        FakeAtomicLeaseStore leases,
        RecordingPublisher? publisher = null,
        Func<Task<IReadOnlyList<DeviceCommandDto>>>? pendingReader = null,
        bool commandDispatchEnabled = true)
    {
        var devices = new Mock<IDeviceService>();
        devices.Setup(service => service.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([device]);

        var commandService = new Mock<IDeviceCommandService>();
        commandService.Setup(service => service.GetPendingCommandsAsync(device.Id, It.IsAny<CancellationToken>()))
            .Returns((Guid _, CancellationToken _) => pendingReader is null
                ? Task.FromResult(commands)
                : pendingReader());
        commandService.Setup(service => service.TryAcquireDispatchLeaseAsync(
                It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(),
                It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns((Guid commandId, Guid ownerId, DateTimeOffset instant, DateTimeOffset until,
                DateTimeOffset _, int maxAttempts, CancellationToken _) =>
                Task.FromResult(leases.TryAcquire(commandId, ownerId, instant, until, maxAttempts)));
        commandService.Setup(service => service.ReleaseDispatchLeaseAsync(
                It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns((Guid commandId, Guid ownerId, CancellationToken _) =>
                Task.FromResult(leases.Release(commandId, ownerId)));

        var settings = Options.Create(new MqttBrokerSettings
        {
            PendingCommandRetrySeconds = (int)RetryDelay.TotalSeconds,
            PendingCommandExpiryMinutes = (int)CommandLifetime.TotalMinutes,
            DeviceOfflineAfterSeconds = (int)OfflineAfter.TotalSeconds,
            MaxPendingCommandRetries = 5,
            CommandDispatchEnabled = commandDispatchEnabled
        });
        var dispatcher = new PendingCommandDispatcher(settings, clock,
            NullLogger<PendingCommandDispatcher>.Instance);

        return new Harness(devices, commandService, publisher ?? new RecordingPublisher(), leases, clock, dispatcher);
    }

    private static DeviceDto CreateDevice(DateTimeOffset now, bool isOnline, DateTimeOffset? lastSeen = null) => new()
    {
        Id = Guid.NewGuid(),
        DeviceCode = "FARM-TEST-001",
        Name = "In-memory test device",
        IsActive = true,
        IsOnline = isOnline,
        LastSeenAtUtc = lastSeen ?? now
    };

    private static DeviceCommandDto CreatePendingCommand(Guid deviceId, DateTimeOffset createdAtUtc, DateTimeOffset expiresAtUtc) => new()
    {
        Id = Guid.NewGuid(),
        DeviceId = deviceId,
        CommandCode = "CMD-TEST-001",
        Action = "START_PUMP",
        Status = CommandStatus.Pending,
        CreatedAtUtc = createdAtUtc,
        ExpiresAtUtc = expiresAtUtc,
        DispatchAttemptCount = 0
    };

    private static DateTimeOffset Utc(string value) => DateTimeOffset.Parse(value, System.Globalization.CultureInfo.InvariantCulture);

    private sealed record Harness(
        Mock<IDeviceService> Devices,
        Mock<IDeviceCommandService> Commands,
        RecordingPublisher Publisher,
        FakeAtomicLeaseStore Leases,
        MutableTimeProvider Clock,
        PendingCommandDispatcher Dispatcher);

    private sealed class FakeAtomicLeaseStore
    {
        private readonly object _gate = new();
        private readonly Dictionary<Guid, (Guid Owner, DateTimeOffset Until, int Attempts)> _leases = new();

        public bool TryAcquire(Guid commandId, Guid owner, DateTimeOffset now, DateTimeOffset until, int maxAttempts)
        {
            lock (_gate)
            {
                _leases.TryGetValue(commandId, out var current);
                if (current.Attempts >= maxAttempts || (current.Until > now && current.Owner != Guid.Empty)) return false;
                _leases[commandId] = (owner, until, current.Attempts + 1);
                return true;
            }
        }

        public bool Release(Guid commandId, Guid owner)
        {
            lock (_gate)
            {
                if (!_leases.TryGetValue(commandId, out var current) || current.Owner != owner) return false;
                _leases[commandId] = (Guid.Empty, DateTimeOffset.MinValue, Math.Max(0, current.Attempts - 1));
                return true;
            }
        }

        public int AttemptsFor(Guid commandId)
        {
            lock (_gate) return _leases.TryGetValue(commandId, out var current) ? current.Attempts : 0;
        }
    }

    private sealed class TwoReaderBarrier(IReadOnlyList<DeviceCommandDto> commands)
    {
        private readonly TaskCompletionSource<IReadOnlyList<DeviceCommandDto>> _ready =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _readers;

        public Task<IReadOnlyList<DeviceCommandDto>> ReadAsync()
        {
            if (Interlocked.Increment(ref _readers) == 2)
                _ready.TrySetResult(commands);
            return _ready.Task;
        }
    }

    private class RecordingPublisher : IMqttPublisher
    {
        private readonly ConcurrentQueue<(string DeviceCode, DeviceCommandDto Command)> _published = new();
        public IReadOnlyCollection<(string DeviceCode, DeviceCommandDto Command)> Published => _published.ToArray();
        public virtual Task PublishCommandAsync(string deviceCode, DeviceCommandDto command, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _published.Enqueue((deviceCode, command));
            return Task.CompletedTask;
        }
    }

    private sealed class AmbiguousFirstPublisher : RecordingPublisher
    {
        private int _calls;
        public ConcurrentQueue<Guid> PublishAttempts { get; } = new();
        public override Task PublishCommandAsync(string deviceCode, DeviceCommandDto command, CancellationToken cancellationToken = default)
        {
            PublishAttempts.Enqueue(command.Id);
            if (Interlocked.Increment(ref _calls) == 1)
                throw new TimeoutException("Publish outcome is ambiguous; broker ACK was lost.");
            return base.PublishCommandAsync(deviceCode, command, cancellationToken);
        }
    }

    private sealed class NotStartedFirstPublisher : RecordingPublisher
    {
        private int _calls;
        public override Task PublishCommandAsync(string deviceCode, DeviceCommandDto command, CancellationToken cancellationToken = default)
        {
            if (Interlocked.Increment(ref _calls) == 1)
                throw new MqttPublishNotStartedException("Broker unavailable before packet was started.");
            return base.PublishCommandAsync(deviceCode, command, cancellationToken);
        }
    }

    private sealed class MutableTimeProvider(DateTimeOffset initialNow) : TimeProvider
    {
        private DateTimeOffset _now = initialNow;
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(TimeSpan duration) => _now = _now.Add(duration);
    }
}
