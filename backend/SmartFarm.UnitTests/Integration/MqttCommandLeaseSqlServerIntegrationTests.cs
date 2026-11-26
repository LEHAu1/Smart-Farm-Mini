using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Persistence.Repositories;

namespace SmartFarm.UnitTests.Integration;

/// <summary>
/// Opt-in SQL Server LocalDB tests for production repository methods.
/// Set SMARTFARM_SQL_LEASE_TESTS=1 to create a uniquely named test database.
/// The database is deliberately retained after tests; these tests never drop databases.
/// </summary>
public sealed class MqttCommandLeaseSqlServerIntegrationTests : IClassFixture<SqlLeaseIntegrationDatabaseFixture>
{
    private readonly Xunit.Abstractions.ITestOutputHelper _output;
    private readonly SqlLeaseIntegrationDatabaseFixture _fixture;

    public MqttCommandLeaseSqlServerIntegrationTests(
        SqlLeaseIntegrationDatabaseFixture fixture,
        Xunit.Abstractions.ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    [SqlLeaseFact]
    public async Task TwoRepositoryInstances_OnlyOneCanClaimSameCommand()
    {
        RequireEnabled();
        var seeded = await SeedAsync();
        var ownerA = Guid.NewGuid();
        var ownerB = Guid.NewGuid();

        await using var contextA = CreateContext();
        await using var contextB = CreateContext();
        var repositoryA = new DeviceCommandRepository(contextA);
        var repositoryB = new DeviceCommandRepository(contextB);

        var claims = await Task.WhenAll(
            repositoryA.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, ownerA, TimeSpan.FromSeconds(20), TimeSpan.FromSeconds(30), 5),
            repositoryB.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, ownerB, TimeSpan.FromSeconds(20), TimeSpan.FromSeconds(30), 5));

        Assert.Equal(1, claims.Count(claimed => claimed));
        await using var verify = CreateContext();
        var stored = await verify.DeviceCommands.SingleAsync(command => command.Id == seeded.CommandId);
        Assert.Equal(1, stored.DispatchAttemptCount);
        Assert.Contains(stored.DispatchLeaseOwnerId, new Guid?[] { ownerA, ownerB });
        Assert.Equal(CommandStatus.Pending, stored.Status);
    }

    [SqlLeaseFact]
    public async Task ApiService_PersistsPendingWithoutPublishing()
    {
        RequireEnabled();
        var seeded = await SeedAsync();

        await using var context = CreateContext();
        var commandRepository = new DeviceCommandRepository(context);
        var deviceRepository = new DeviceRepository(context);
        var service = new DeviceCommandService(
            commandRepository,
            deviceRepository,
            new DeviceCommandQueueOptions { PendingCommandExpiryMinutes = 10 },
            NullLogger<DeviceCommandService>.Instance);

        var result = await service.CreateCommandAsync(new CreateDeviceCommandRequest
        {
            DeviceId = seeded.DeviceId,
            Action = "START_PUMP",
            Payload = "integration-test-only"
        });

        Assert.Equal(CommandStatus.Pending, result.Status);
        Assert.True(result.ExpiresAtUtc > result.CreatedAtUtc);
        Assert.Null(result.AcknowledgedAtUtc);
        Assert.Null(result.CompletedAtUtc);

        await using var verify = CreateContext();
        var stored = await verify.DeviceCommands.SingleAsync(command => command.Id == result.Id);
        Assert.Equal(CommandStatus.Pending, stored.Status);
        Assert.Equal("START_PUMP", stored.Action);
        Assert.Equal(0, stored.DispatchAttemptCount);
        Assert.Null(stored.DispatchLeaseOwnerId);
        Assert.Null(stored.DispatchLeaseUntilUtc);
    }

    [SqlLeaseFact]
    public async Task CrashAfterClaim_LeaseBlocksOtherInstanceUntilExpiryThenAllowsRecovery()
    {
        RequireEnabled();
        var seeded = await SeedAsync();
        var firstOwner = Guid.NewGuid();
        var recoveryOwner = Guid.NewGuid();

        await using (var firstContext = CreateContext())
        {
            var firstRepository = new DeviceCommandRepository(firstContext);
            Assert.True(await firstRepository.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, firstOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 4));
        }

        await using (var recoveryContext = CreateContext())
        {
            var recoveryRepository = new DeviceCommandRepository(recoveryContext);
            Assert.False(await recoveryRepository.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, recoveryOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 4));
        }

        await Task.Delay(TimeSpan.FromMilliseconds(1300));

        await using var recoveredContext = CreateContext();
        var recoveredRepository = new DeviceCommandRepository(recoveredContext);
        Assert.True(await recoveredRepository.TryAcquireDispatchLeaseAsync(
            seeded.CommandId, recoveryOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 4));

        var stored = await recoveredContext.DeviceCommands.SingleAsync(command => command.Id == seeded.CommandId);
        Assert.Equal(2, stored.DispatchAttemptCount);
        Assert.Equal(recoveryOwner, stored.DispatchLeaseOwnerId);
        Assert.Equal(seeded.CommandId, stored.Id); // Retry identity is stable.
    }

    [SqlLeaseFact]
    public async Task AmbiguousPublish_LeaseIsRetainedAndRetryReusesSameCommandId()
    {
        RequireEnabled();
        var seeded = await SeedAsync();
        var firstOwner = Guid.NewGuid();
        var retryOwner = Guid.NewGuid();

        // A publish may have reached the broker/device even if the process lost its ACK.
        // The repository has no "publish succeeded" transition; the outstanding lease is
        // intentionally retained across a process/context restart.
        await using (var firstContext = CreateContext())
        {
            var repository = new DeviceCommandRepository(firstContext);
            Assert.True(await repository.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, firstOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 3));
        }

        await using (var retryContext = CreateContext())
        {
            var repository = new DeviceCommandRepository(retryContext);
            Assert.False(await repository.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, retryOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 3));
        }

        await Task.Delay(TimeSpan.FromMilliseconds(1300));

        await using var retryContextAfterLease = CreateContext();
        var retryRepository = new DeviceCommandRepository(retryContextAfterLease);
        Assert.True(await retryRepository.TryAcquireDispatchLeaseAsync(
            seeded.CommandId, retryOwner, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 3));
        Assert.Equal(seeded.CommandId,
            (await retryContextAfterLease.DeviceCommands.SingleAsync(command => command.Id == seeded.CommandId)).Id);
    }

    [SqlLeaseFact]
    public async Task LateAcknowledgement_MakesPendingCommandUnclaimableAndClearsLease()
    {
        RequireEnabled();
        var seeded = await SeedAsync();
        var owner = Guid.NewGuid();

        await using (var claimingContext = CreateContext())
        {
            var repository = new DeviceCommandRepository(claimingContext);
            Assert.True(await repository.TryAcquireDispatchLeaseAsync(
                seeded.CommandId, owner, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30), 3));
        }

        await using (var ackContext = CreateContext())
        {
            var repository = new DeviceCommandRepository(ackContext);
            var command = await repository.GetByIdAsync(seeded.CommandId);
            Assert.NotNull(command);
            command.Acknowledge(DateTimeOffset.UtcNow);
            await repository.UpdateAsync(command);
            await repository.SaveChangesAsync();
        }

        await using var retryContext = CreateContext();
        var retryRepository = new DeviceCommandRepository(retryContext);
        Assert.False(await retryRepository.TryAcquireDispatchLeaseAsync(
            seeded.CommandId, Guid.NewGuid(), TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30), 3));
        var stored = await retryContext.DeviceCommands.SingleAsync(command => command.Id == seeded.CommandId);
        Assert.Equal(CommandStatus.Acknowledged, stored.Status);
        Assert.Null(stored.DispatchLeaseOwnerId);
        Assert.Null(stored.DispatchLeaseUntilUtc);
    }

    [SqlLeaseFact]
    public async Task RepeatedDuplicateDelivery_RetryLimitStopsFurtherClaimsForStableId()
    {
        RequireEnabled();
        var seeded = await SeedAsync();
        var firstId = seeded.CommandId;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            await using var context = CreateContext();
            var repository = new DeviceCommandRepository(context);
            Assert.True(await repository.TryAcquireDispatchLeaseAsync(
                firstId, Guid.NewGuid(), TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 2));
            var command = await context.DeviceCommands.SingleAsync(item => item.Id == firstId);
            Assert.Equal(attempt, command.DispatchAttemptCount);
            Assert.Equal(firstId, command.Id);

            if (attempt < 2)
                await Task.Delay(TimeSpan.FromMilliseconds(1300));
        }

        await using var exhaustedContext = CreateContext();
        var exhaustedRepository = new DeviceCommandRepository(exhaustedContext);
        Assert.False(await exhaustedRepository.TryAcquireDispatchLeaseAsync(
            firstId, Guid.NewGuid(), TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), 2));
        Assert.Equal(2, (await exhaustedContext.DeviceCommands.SingleAsync(item => item.Id == firstId)).DispatchAttemptCount);
    }

    [SqlLeaseFact]
    public async Task ExpiredCommand_IsNotClaimed()
    {
        RequireEnabled();
        var seeded = await SeedAsync(expiredCommand: true);

        await using var context = CreateContext();
        var repository = new DeviceCommandRepository(context);
        Assert.False(await repository.TryAcquireDispatchLeaseAsync(
            seeded.CommandId, Guid.NewGuid(), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30), 3));
        Assert.Equal(0, (await context.DeviceCommands.SingleAsync(item => item.Id == seeded.CommandId)).DispatchAttemptCount);
    }

    [SqlLeaseFact]
    public async Task StaleHeartbeat_IsNotClaimed()
    {
        RequireEnabled();
        var seeded = await SeedAsync(lastSeenAge: TimeSpan.FromMinutes(2));

        await using var context = CreateContext();
        var repository = new DeviceCommandRepository(context);
        Assert.False(await repository.TryAcquireDispatchLeaseAsync(
            seeded.CommandId, Guid.NewGuid(), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30), 3));
        Assert.Equal(0, (await context.DeviceCommands.SingleAsync(item => item.Id == seeded.CommandId)).DispatchAttemptCount);
    }

    [SqlLeaseFact]
    public async Task IrrigationLogRepository_ReturnsBoundedRecentLogsPerDevice()
    {
        RequireEnabled();
        var now = DateTimeOffset.UtcNow;
        var firstDevice = await SeedDeviceAsync(now, "RECENT-A");
        var secondDevice = await SeedDeviceAsync(now, "RECENT-B");

        await using (var seedContext = CreateContext())
        {
            foreach (var deviceId in new[] { firstDevice, secondDevice })
            {
                for (var offset = 0; offset < 7; offset++)
                {
                    var log = new IrrigationLog(
                        deviceId,
                        IrrigationMode.Manual,
                        now.AddMinutes(-offset));
                    log.Complete(now.AddMinutes(-offset).AddSeconds(10), null, null);
                    seedContext.IrrigationLogs.Add(log);
                }
            }

            await seedContext.SaveChangesAsync();
        }

        await using var queryContext = CreateContext();
        var repository = new IrrigationLogRepository(queryContext);
        var results = await repository.GetRecentByDeviceIdsAsync(
            new[] { firstDevice, secondDevice, firstDevice },
            limitPerDevice: 5);

        Assert.Equal(10, results.Count);
        Assert.Equal(5, results.Count(log => log.DeviceId == firstDevice));
        Assert.Equal(5, results.Count(log => log.DeviceId == secondDevice));
        Assert.All(results.GroupBy(log => log.DeviceId), group =>
            Assert.Equal(group.OrderByDescending(log => log.StartedAtUtc)
                .ThenByDescending(log => log.Id)
                .Select(log => log.Id), group.Select(log => log.Id)));
    }

    [SqlLeaseFact]
    public async Task SensorReadingRepository_ReturnsBoundedLatestReadingsPerDevice()
    {
        RequireEnabled();
        var now = DateTimeOffset.UtcNow;
        var firstDevice = await SeedDeviceAsync(now, "SENSOR-A");
        var secondDevice = await SeedDeviceAsync(now, "SENSOR-B");

        await using (var seedContext = CreateContext())
        {
            foreach (var deviceId in new[] { firstDevice, secondDevice })
            {
                for (var offset = 0; offset < 7; offset++)
                {
                    var recordedAtUtc = now.AddMinutes(-offset);
                    seedContext.SensorReadings.Add(new SensorReading(
                        deviceId,
                        SensorType.AirHumidity,
                        40 + offset,
                        "%",
                        recordedAtUtc,
                        recordedAtUtc.AddSeconds(1)));
                }
            }

            await seedContext.SaveChangesAsync();
        }

        await using var queryContext = CreateContext();
        var repository = new SensorReadingRepository(queryContext);
        var results = await repository.GetLatestByDeviceIdsAsync(
            new[] { firstDevice, secondDevice, firstDevice },
            countPerDevice: 5);

        Assert.Equal(10, results.Count);
        Assert.Equal(5, results.Count(reading => reading.DeviceId == firstDevice));
        Assert.Equal(5, results.Count(reading => reading.DeviceId == secondDevice));
        Assert.All(results.GroupBy(reading => reading.DeviceId), group =>
            Assert.Equal(group.OrderByDescending(reading => reading.RecordedAtUtc)
                .ThenByDescending(reading => reading.Id)
                .Select(reading => reading.Id), group.Select(reading => reading.Id)));
    }

    private void RequireEnabled()
    {
        if (!_fixture.Enabled)
        {
            throw new InvalidOperationException(
                "The SQL lease integration fixture was not enabled for this test run.");
        }
        _output.WriteLine($"Disposable SQL lease integration database: {_fixture.DatabaseName}");
    }

    private SmartFarmDbContext CreateContext()
    {
        if (_fixture.Options is null)
            throw new InvalidOperationException("The disposable SQL Server database was not initialized.");
        return new SmartFarmDbContext(_fixture.Options);
    }

    private async Task<SeededCommand> SeedAsync(
        TimeSpan? commandLifetime = null,
        bool expiredCommand = false,
        TimeSpan? lastSeenAge = null)
    {
        await using var context = CreateContext();
        var now = DateTimeOffset.UtcNow;
        var heartbeatAge = lastSeenAge ?? TimeSpan.FromSeconds(1);
        var deviceCreatedAt = now.Subtract(heartbeatAge);
        var userId = Guid.NewGuid();
        var device = new Device(userId, $"LEASE-{Guid.NewGuid():N}"[..20], "Lease integration test", deviceCreatedAt);
        device.MarkOnline(deviceCreatedAt);

        context.Users.Add(new AppUser
        {
            Id = userId,
            UserName = $"lease-{Guid.NewGuid():N}",
            NormalizedUserName = $"LEASE-{Guid.NewGuid():N}",
            Email = $"lease-{Guid.NewGuid():N}@example.invalid",
            NormalizedEmail = $"LEASE-{Guid.NewGuid():N}@EXAMPLE.INVALID",
            EmailConfirmed = true,
            AuthProvider = "Local",
            CreatedAtUtc = deviceCreatedAt
        });
        context.Devices.Add(device);
        await context.SaveChangesAsync();

        var createdAt = expiredCommand
            ? DateTimeOffset.UtcNow.Subtract(TimeSpan.FromMinutes(2))
            : DateTimeOffset.UtcNow;
        var lifetime = commandLifetime ?? TimeSpan.FromMinutes(10);
        var expiresAt = expiredCommand
            ? createdAt.AddMinutes(1)
            : createdAt.Add(lifetime);
        var command = new DeviceCommand(
            device.Id,
            $"LEASE-{Guid.NewGuid():N}",
            "START_PUMP",
            createdAt,
            "test-only; no publisher",
            expiresAt);
        context.DeviceCommands.Add(command);
        await context.SaveChangesAsync();
        return new SeededCommand(userId, device.Id, command.Id);
    }

    private async Task<Guid> SeedDeviceAsync(DateTimeOffset createdAtUtc, string codePrefix)
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();
        var deviceCode = $"{codePrefix}-{Guid.NewGuid():N}"[..30];
        var device = new Device(userId, deviceCode, "Irrigation query test", createdAtUtc);

        context.Users.Add(new AppUser
        {
            Id = userId,
            UserName = $"{codePrefix.ToLowerInvariant()}-{Guid.NewGuid():N}",
            NormalizedUserName = $"{codePrefix}-{Guid.NewGuid():N}".ToUpperInvariant(),
            Email = $"{Guid.NewGuid():N}@example.invalid",
            NormalizedEmail = $"{Guid.NewGuid():N}@EXAMPLE.INVALID",
            EmailConfirmed = true,
            AuthProvider = "Local",
            CreatedAtUtc = createdAtUtc
        });
        context.Devices.Add(device);
        await context.SaveChangesAsync();
        return device.Id;
    }

    private sealed record SeededCommand(Guid OwnerId, Guid DeviceId, Guid CommandId);
}

/// <summary>
/// One fresh, uniquely named LocalDB database per test-class run. It is retained after
/// execution and is never dropped or reused by these tests.
/// </summary>
public sealed class SqlLeaseIntegrationDatabaseFixture : IAsyncLifetime
{
    public bool Enabled { get; private set; }
    public string? DatabaseName { get; private set; }
    public DbContextOptions<SmartFarmDbContext>? Options { get; private set; }

    public async Task InitializeAsync()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("SMARTFARM_SQL_LEASE_TESTS"), "1",
                StringComparison.Ordinal))
        {
            return;
        }

        DatabaseName = $"SmartFarmLeaseIT_{Guid.NewGuid():N}";
        var connectionString = new SqlConnectionStringBuilder
        {
            DataSource = @"(localdb)\MSSQLLocalDB",
            InitialCatalog = DatabaseName,
            IntegratedSecurity = true,
            TrustServerCertificate = true,
            ConnectTimeout = 20,
            MultipleActiveResultSets = true
        }.ConnectionString;

        // Fail closed on the vanishingly unlikely name collision. Never overwrite a DB.
        var masterConnectionString = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = "master"
        }.ConnectionString;
        await using (var connection = new SqlConnection(masterConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE [name] = @DatabaseName;";
            command.Parameters.AddWithValue("@DatabaseName", DatabaseName);
            var exists = Convert.ToInt32(await command.ExecuteScalarAsync());
            if (exists != 0)
                throw new InvalidOperationException($"Refusing to use existing database '{DatabaseName}'.");
        }

        Options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        await using (var context = new SmartFarmDbContext(Options))
            await context.Database.MigrateAsync();

        Enabled = true;
    }

    public Task DisposeAsync()
    {
        // Intentionally retain the uniquely named DB for inspection; no DROP DATABASE.
        return Task.CompletedTask;
    }
}

/// <summary>Skips these LocalDB tests at discovery time unless explicitly opted in.</summary>
public sealed class SqlLeaseFactAttribute : FactAttribute
{
    public SqlLeaseFactAttribute()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("SMARTFARM_SQL_LEASE_TESTS"), "1",
                StringComparison.Ordinal))
        {
            Skip = "Set SMARTFARM_SQL_LEASE_TESTS=1 to run isolated SQL Server LocalDB integration tests.";
        }
    }
}
