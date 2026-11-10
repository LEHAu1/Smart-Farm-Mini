using Microsoft.EntityFrameworkCore;
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
    }
}
