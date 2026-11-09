using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa SensorReadingAggregate Repository sử dụng Entity Framework Core
    /// </summary>
    public class SensorReadingAggregateRepository : ISensorReadingAggregateRepository
    {
        private readonly SmartFarmDbContext _context;

        public SensorReadingAggregateRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<IReadOnlyList<SensorReadingAggregate>> GetAggregatesAsync(
            Guid deviceId,
            SensorType? sensorType,
            DateTimeOffset fromUtc,
            DateTimeOffset toUtc,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SensorReadingAggregates
                .AsNoTracking()
                .Where(a => a.DeviceId == deviceId && a.HourBucket >= fromUtc && a.HourBucket <= toUtc);

            if (sensorType.HasValue)
            {
                query = query.Where(a => a.SensorType == sensorType.Value);
            }

            return await query
                .OrderBy(a => a.HourBucket)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(SensorReadingAggregate aggregate, CancellationToken cancellationToken = default)
        {
            await _context.SensorReadingAggregates.AddAsync(aggregate, cancellationToken);
        }

        public async Task AddRangeAsync(IEnumerable<SensorReadingAggregate> aggregates, CancellationToken cancellationToken = default)
        {
            await _context.SensorReadingAggregates.AddRangeAsync(aggregates, cancellationToken);
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}

