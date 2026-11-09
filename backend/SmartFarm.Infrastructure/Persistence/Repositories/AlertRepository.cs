using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa Alert Repository sử dụng Entity Framework Core
    /// </summary>
    public class AlertRepository : IAlertRepository
    {
        private readonly SmartFarmDbContext _context;

        public AlertRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<Alert?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Alerts
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<Alert>> GetByDeviceIdAsync(
            Guid deviceId,
            bool? isResolved = null,
            int limit = 50,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Alerts
                .AsNoTracking()
                .Where(a => a.DeviceId == deviceId);

            if (isResolved.HasValue)
            {
                query = query.Where(a => a.IsResolved == isResolved.Value);
            }

            return await query
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<Alert>> GetUnresolvedAlertsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Alerts
                .AsNoTracking()
                .Where(a => !a.IsResolved)
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(Alert alert, CancellationToken cancellationToken = default)
        {
            await _context.Alerts.AddAsync(alert, cancellationToken);
        }

        public Task UpdateAsync(Alert alert, CancellationToken cancellationToken = default)
        {
            _context.Alerts.Update(alert);
            return Task.CompletedTask;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
