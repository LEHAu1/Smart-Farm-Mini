using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ dữ liệu cảm biến tổng hợp theo giờ (SensorReadingAggregate Repository)
    /// </summary>
    public interface ISensorReadingAggregateRepository
    {
        Task<IReadOnlyList<SensorReadingAggregate>> GetAggregatesAsync(
            Guid deviceId,
            SensorType? sensorType,
            DateTimeOffset fromUtc,
            DateTimeOffset toUtc,
            CancellationToken cancellationToken = default);

        Task AddAsync(SensorReadingAggregate aggregate, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<SensorReadingAggregate> aggregates, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}

