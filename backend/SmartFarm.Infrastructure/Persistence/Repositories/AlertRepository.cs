using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Domain.Enums;
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

        public async Task<PageResult<Alert>> GetPagedAsync(Guid? ownerId, Guid? deviceId, AlertSeverity? severity, bool? isResolved, PaginationParams pagination, CancellationToken cancellationToken = default)
        {
            var query = VisibleAlerts(ownerId);
            if (deviceId.HasValue)
                query = query.Where(item => item.DeviceId == deviceId.Value);
            if (severity.HasValue)
                query = query.Where(item => item.Severity == severity.Value);
            if (isResolved.HasValue)
                query = query.Where(item => item.IsResolved == isResolved.Value);

            var total = await query.CountAsync(cancellationToken);
            var offset = ((long)pagination.PageIndex - 1) * pagination.PageSize;
            if (offset >= total)
                return new PageResult<Alert>(Array.Empty<Alert>(), total, pagination.PageIndex, pagination.PageSize);

            var items = await query.OrderByDescending(item => item.CreatedAtUtc)
                .ThenByDescending(item => item.Id)
                .Skip((int)offset)
                .Take(pagination.PageSize)
                .ToListAsync(cancellationToken);

            return new PageResult<Alert>(items, total, pagination.PageIndex, pagination.PageSize);
        }

        public async Task<AlertSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default)
        {
            var summary = await VisibleAlerts(ownerId)
                .GroupBy(_ => 1)
                .Select(group => new AlertSummaryDto(
                    group.Count(),
                    group.Count(alert => alert.Severity == AlertSeverity.Critical),
                    group.Count(alert => alert.Severity == AlertSeverity.Warning),
                    group.Count(alert => alert.Severity == AlertSeverity.Info),
                    group.Count(alert => !alert.IsResolved)))
                .SingleOrDefaultAsync(cancellationToken);

            return summary ?? new AlertSummaryDto(0, 0, 0, 0, 0);
        }

        private IQueryable<Alert> VisibleAlerts(Guid? ownerId)
        {
            var query = _context.Alerts.AsNoTracking();
            if (ownerId.HasValue)
                query = query.Where(item => _context.Devices.Any(device => device.Id == item.DeviceId && device.OwnerId == ownerId.Value));
            return query;
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
