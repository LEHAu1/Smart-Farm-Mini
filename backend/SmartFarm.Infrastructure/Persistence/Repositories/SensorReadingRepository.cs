using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa SensorReading Repository sử dụng Entity Framework Core
    /// </summary>
    public class SensorReadingRepository : ISensorReadingRepository
    {
        private readonly SmartFarmDbContext _context;

        public SensorReadingRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<SensorReading?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.SensorReadings
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<SensorReading>> GetLatestByDeviceIdAsync(
            Guid deviceId,
            int count = 10,
            CancellationToken cancellationToken = default)
        {
            return await _context.SensorReadings
                .AsNoTracking()
                .Where(s => s.DeviceId == deviceId)
                .OrderByDescending(s => s.RecordedAtUtc)
                .Take(count)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<SensorReading>> GetLatestByDeviceIdsAsync(
            IReadOnlyCollection<Guid> deviceIds,
            int countPerDevice = 10,
            CancellationToken cancellationToken = default)
        {
            if (deviceIds.Count == 0 || countPerDevice <= 0)
            {
                return Array.Empty<SensorReading>();
            }

            return await _context.SensorReadings
                .AsNoTracking()
                .Where(reading => deviceIds.Contains(reading.DeviceId))
                .GroupBy(reading => reading.DeviceId)
                .SelectMany(group => group
                    .OrderByDescending(reading => reading.RecordedAtUtc)
                    .Take(countPerDevice))
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<SensorReading>> GetByDeviceIdAndRangeAsync(
            Guid deviceId,
            SensorType? sensorType,
            DateTimeOffset fromUtc,
            DateTimeOffset toUtc,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SensorReadings
                .AsNoTracking()
                .Where(s => s.DeviceId == deviceId && s.RecordedAtUtc >= fromUtc && s.RecordedAtUtc <= toUtc);

            if (sensorType.HasValue)
            {
                query = query.Where(s => s.SensorType == sensorType.Value);
            }

            return await query
                .OrderBy(s => s.RecordedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(SensorReading reading, CancellationToken cancellationToken = default)
        {
            await _context.SensorReadings.AddAsync(reading, cancellationToken);
        }

        public async Task AddRangeAsync(IEnumerable<SensorReading> readings, CancellationToken cancellationToken = default)
        {
            await _context.SensorReadings.AddRangeAsync(readings, cancellationToken);
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
