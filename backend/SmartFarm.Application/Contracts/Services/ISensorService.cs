using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện dịch vụ nghiệp vụ cảm biến (Sensor Service)
    /// </summary>
    public interface ISensorService
    {
        Task<SensorReadingDto> RecordReadingAsync(CreateSensorReadingRequest request, CancellationToken cancellationToken = default);
        Task<int> RecordReadingsBatchAsync(IEnumerable<CreateSensorReadingRequest> requests, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SensorReadingDto>> GetLatestReadingsAsync(Guid deviceId, int count = 10, CancellationToken cancellationToken = default);
        Task<SensorTelemetryDto> GetCurrentTelemetryAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<SensorHistoryDto> GetSensorHistoryAsync(Guid deviceId, SensorType sensorType, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SensorAggregateDto>> GetAggregatesAsync(Guid deviceId, SensorType? sensorType, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default);
    }
}
