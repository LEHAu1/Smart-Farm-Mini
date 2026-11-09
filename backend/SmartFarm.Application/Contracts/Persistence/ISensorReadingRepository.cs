using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ dữ liệu cảm biến (SensorReading Repository)
    /// </summary>
    public interface ISensorReadingRepository
    {
        Task<SensorReading?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SensorReading>> GetLatestByDeviceIdAsync(Guid deviceId, int count = 10, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SensorReading>> GetByDeviceIdAndRangeAsync(Guid deviceId, SensorType? sensorType, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default);
        Task AddAsync(SensorReading reading, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<SensorReading> readings, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
