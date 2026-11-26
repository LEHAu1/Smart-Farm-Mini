using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa DeviceCommand Repository sử dụng Entity Framework Core
    /// </summary>
    public class DeviceCommandRepository : IDeviceCommandRepository
    {
        private readonly SmartFarmDbContext _context;

        public DeviceCommandRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<PageResult<DeviceCommand>> GetPagedAsync(Guid? ownerId, Guid? deviceId, CommandStatus? status, PaginationParams pagination, CancellationToken cancellationToken = default)
        {
            var query = VisibleDeviceCommands(ownerId);
            if (deviceId.HasValue)
                query = query.Where(item => item.DeviceId == deviceId.Value);
            if (status.HasValue)
                query = query.Where(item => item.Status == status.Value);

            var total = await query.CountAsync(cancellationToken);
            var offset = ((long)pagination.PageIndex - 1) * pagination.PageSize;
            if (offset >= total)
                return new PageResult<DeviceCommand>(Array.Empty<DeviceCommand>(), total, pagination.PageIndex, pagination.PageSize);

            var items = await query.OrderByDescending(item => item.CreatedAtUtc)
                .ThenByDescending(item => item.Id)
                .Skip((int)offset)
                .Take(pagination.PageSize)
                .ToListAsync(cancellationToken);

            return new PageResult<DeviceCommand>(items, total, pagination.PageIndex, pagination.PageSize);
        }

        private IQueryable<DeviceCommand> VisibleDeviceCommands(Guid? ownerId)
        {
            var query = _context.DeviceCommands.AsNoTracking();
            if (ownerId.HasValue)
                query = query.Where(item => _context.Devices.Any(device => device.Id == item.DeviceId && device.OwnerId == ownerId.Value));
            return query;
        }

        public async Task<DeviceCommand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        }

        public async Task<DeviceCommand?> GetByCommandCodeAsync(string commandCode, CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .FirstOrDefaultAsync(c => c.CommandCode == commandCode, cancellationToken);
        }

        public async Task<IReadOnlyList<DeviceCommand>> GetPendingCommandsByDeviceIdAsync(
            Guid deviceId,
            CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .Where(c => c.DeviceId == deviceId && c.Status == CommandStatus.Pending)
                .OrderBy(c => c.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> TryAcquireDispatchLeaseAsync(
            Guid commandId,
            Guid leaseOwnerId,
            TimeSpan leaseDuration,
            TimeSpan deviceOfflineAfter,
            int maxAttempts,
            CancellationToken cancellationToken = default)
        {
            if (commandId == Guid.Empty)
                throw new ArgumentException("Command ID cannot be empty.", nameof(commandId));
            if (leaseOwnerId == Guid.Empty)
                throw new ArgumentException("Lease owner ID cannot be empty.", nameof(leaseOwnerId));
            if (leaseDuration <= TimeSpan.Zero)
                throw new ArgumentOutOfRangeException(nameof(leaseDuration), "Lease duration must be positive.");
            if (deviceOfflineAfter <= TimeSpan.Zero)
                throw new ArgumentOutOfRangeException(nameof(deviceOfflineAfter), "Offline window must be positive.");
            if (maxAttempts is < 1 or > 20)
                throw new ArgumentOutOfRangeException(nameof(maxAttempts), "Dispatch attempts must be between 1 and 20.");

            var leaseSeconds = Math.Clamp((int)Math.Ceiling(leaseDuration.TotalSeconds), 1, 600);
            var offlineSeconds = Math.Clamp((int)Math.Ceiling(deviceOfflineAfter.TotalSeconds), 15, 86400);

            // A single conditional UPDATE obtains the lease atomically across API instances.
            // Device eligibility is checked in the same statement to avoid relying on a stale
            // caller-side online snapshot. Device state can still change after this statement
            // and before MQTT publish; the lease prevents concurrent dispatch, not that race.
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            await using var command = _context.Database.GetDbConnection().CreateCommand();
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = """
                DECLARE @DatabaseNowUtc datetimeoffset(7) = TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00');

                UPDATE [command] WITH (UPDLOCK, ROWLOCK)
                SET [DispatchLeaseOwnerId] = @LeaseOwnerId,
                    [DispatchLeaseUntilUtc] = DATEADD(SECOND, @LeaseSeconds, @DatabaseNowUtc),
                    [DispatchAttemptCount] = [DispatchAttemptCount] + 1
                FROM [dbo].[DeviceCommands] AS [command]
                INNER JOIN [dbo].[Devices] AS [device]
                    ON [device].[Id] = [command].[DeviceId]
                WHERE [command].[Id] = @CommandId
                  AND [command].[Status] = @PendingStatus
                  AND [command].[ExpiresAtUtc] > @DatabaseNowUtc
                  AND [command].[DispatchAttemptCount] < @MaxAttempts
                  AND ([command].[DispatchLeaseUntilUtc] IS NULL
                       OR [command].[DispatchLeaseUntilUtc] <= @DatabaseNowUtc)
                  AND [device].[IsActive] = 1
                  AND [device].[IsOnline] = 1
                  AND [device].[IsDeleted] = 0
                  AND [device].[LastSeenAtUtc] IS NOT NULL
                  AND [device].[LastSeenAtUtc] >= DATEADD(SECOND, -@OfflineSeconds, @DatabaseNowUtc)
                  AND [device].[LastSeenAtUtc] <= @DatabaseNowUtc;
                """;

            AddParameter(command, "@CommandId", DbType.Guid, commandId);
            AddParameter(command, "@LeaseOwnerId", DbType.Guid, leaseOwnerId);
            AddParameter(command, "@LeaseSeconds", DbType.Int32, leaseSeconds);
            AddParameter(command, "@OfflineSeconds", DbType.Int32, offlineSeconds);
            AddParameter(command, "@MaxAttempts", DbType.Int32, maxAttempts);
            AddParameter(command, "@PendingStatus", DbType.Byte, (byte)CommandStatus.Pending);

            var affectedRows = await command.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return affectedRows == 1;
        }

        public async Task<bool> ReleaseDispatchLeaseAsync(
            Guid commandId,
            Guid leaseOwnerId,
            CancellationToken cancellationToken = default)
        {
            if (commandId == Guid.Empty)
                throw new ArgumentException("Command ID cannot be empty.", nameof(commandId));
            if (leaseOwnerId == Guid.Empty)
                throw new ArgumentException("Lease owner ID cannot be empty.", nameof(leaseOwnerId));

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            await using var command = _context.Database.GetDbConnection().CreateCommand();
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = """
                UPDATE [dbo].[DeviceCommands]
                SET [DispatchLeaseOwnerId] = NULL,
                    [DispatchLeaseUntilUtc] = NULL,
                    [DispatchAttemptCount] = CASE
                        WHEN [DispatchAttemptCount] > 0 THEN [DispatchAttemptCount] - 1
                        ELSE 0
                    END
                WHERE [Id] = @CommandId
                  AND [DispatchLeaseOwnerId] = @LeaseOwnerId
                  AND [Status] = @PendingStatus;
                """;
            AddParameter(command, "@CommandId", DbType.Guid, commandId);
            AddParameter(command, "@LeaseOwnerId", DbType.Guid, leaseOwnerId);
            AddParameter(command, "@PendingStatus", DbType.Byte, (byte)CommandStatus.Pending);

            var released = await command.ExecuteNonQueryAsync(cancellationToken) == 1;
            await transaction.CommitAsync(cancellationToken);
            return released;
        }

        public async Task<IReadOnlyList<DeviceCommand>> GetRecentByDeviceIdAsync(
            Guid deviceId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .AsNoTracking()
                .Where(c => c.DeviceId == deviceId)
                .OrderByDescending(c => c.CreatedAtUtc)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(DeviceCommand command, CancellationToken cancellationToken = default)
        {
            await _context.DeviceCommands.AddAsync(command, cancellationToken);
        }

        public Task UpdateAsync(DeviceCommand command, CancellationToken cancellationToken = default)
        {
            _context.DeviceCommands.Update(command);
            return Task.CompletedTask;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }

        private static void AddParameter(System.Data.Common.DbCommand command, string name, DbType type, object value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.DbType = type;
            parameter.Value = value;
            command.Parameters.Add(parameter);
        }

    }
}
