using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa IrrigationLog Repository sử dụng Entity Framework Core
    /// </summary>
    public class IrrigationLogRepository : IIrrigationLogRepository
    {
        private readonly SmartFarmDbContext _context;

        public IrrigationLogRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<IrrigationLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationLogs
                .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<IrrigationLog>> GetByDeviceIdAsync(
            Guid deviceId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationLogs
                .AsNoTracking()
                .Where(l => l.DeviceId == deviceId)
                .OrderByDescending(l => l.StartedAtUtc)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public async Task<(IReadOnlyList<IrrigationLog> Items, int TotalCount)> GetPagedAsync(
            Guid? ownerId,
            Guid? deviceId,
            IrrigationMode? mode,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var query = _context.IrrigationLogs.AsNoTracking().AsQueryable();

            if (ownerId.HasValue && ownerId.Value != Guid.Empty)
            {
                query = query.Where(l =>
                    _context.Devices.Any(d => d.Id == l.DeviceId && d.OwnerId == ownerId.Value));
            }

            if (deviceId.HasValue && deviceId.Value != Guid.Empty)
            {
                query = query.Where(l => l.DeviceId == deviceId.Value);
            }

            if (mode.HasValue)
            {
                query = query.Where(l => l.Mode == mode.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
            var safePageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 100);

            var items = await query
                .OrderByDescending(l => l.StartedAtUtc)
                .Skip((safePageNumber - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync(cancellationToken);

            return (items, totalCount);
        }

        public async Task<IrrigationLog?> GetLatestByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationLogs
                .AsNoTracking()
                .Where(l => l.DeviceId == deviceId)
                .OrderByDescending(l => l.StartedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<IrrigationLog?> GetCurrentInProgressByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationLogs
                .FirstOrDefaultAsync(l => l.DeviceId == deviceId && l.Status == IrrigationStatus.InProgress, cancellationToken);
        }

        public async Task AddAsync(IrrigationLog log, CancellationToken cancellationToken = default)
        {
            await _context.IrrigationLogs.AddAsync(log, cancellationToken);
        }

        public Task UpdateAsync(IrrigationLog log, CancellationToken cancellationToken = default)
        {
            _context.IrrigationLogs.Update(log);
            return Task.CompletedTask;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
