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
