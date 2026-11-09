using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa SystemLog Repository sử dụng Entity Framework Core
    /// </summary>
    public class SystemLogRepository : ISystemLogRepository
    {
        private readonly SmartFarmDbContext _context;

        public SystemLogRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<SystemLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.SystemLogs
                .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<SystemLog>> GetLogsAsync(
            Guid? deviceId = null,
            LogLevel? level = null,
            LogSource? source = null,
            int limit = 100,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SystemLogs.AsNoTracking();

            if (deviceId.HasValue)
            {
                query = query.Where(l => l.DeviceId == deviceId.Value);
            }

            if (level.HasValue)
            {
                query = query.Where(l => l.Level == level.Value);
            }

            if (source.HasValue)
            {
                query = query.Where(l => l.Source == source.Value);
            }

            return await query
                .OrderByDescending(l => l.CreatedAtUtc)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(SystemLog log, CancellationToken cancellationToken = default)
        {
            await _context.SystemLogs.AddAsync(log, cancellationToken);
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
