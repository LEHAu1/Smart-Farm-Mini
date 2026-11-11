using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Hiện thực hóa Sensor Service xử lý nghiệp vụ dữ liệu cảm biến
    /// </summary>
    public class SensorService : ISensorService
    {
        private readonly ISensorReadingRepository _sensorReadingRepository;
        private readonly ISensorReadingAggregateRepository _aggregateRepository;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ILogger<SensorService> _logger;

        public SensorService(
            ISensorReadingRepository sensorReadingRepository,
            ISensorReadingAggregateRepository aggregateRepository,
            IDeviceRepository deviceRepository,
            ILogger<SensorService> logger)
        {
            _sensorReadingRepository = sensorReadingRepository ?? throw new ArgumentNullException(nameof(sensorReadingRepository));
            _aggregateRepository = aggregateRepository ?? throw new ArgumentNullException(nameof(aggregateRepository));
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<SensorReadingDto> RecordReadingAsync(
            CreateSensorReadingRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                _logger.LogWarning("Không thể lưu cảm biến: Thiết bị ID {DeviceId} không tồn tại.", request.DeviceId);
                throw new DeviceNotFoundException(request.DeviceId);
            }

            var recordedAtUtc = request.RecordedAtUtc ?? DateTimeOffset.UtcNow;
            var receivedAtUtc = DateTimeOffset.UtcNow;

            if (receivedAtUtc < recordedAtUtc)
            {
                receivedAtUtc = recordedAtUtc;
            }

            var reading = new SensorReading(
                request.DeviceId,
                request.SensorType,
                request.Value,
                request.Unit,
                recordedAtUtc,
                receivedAtUtc,
                request.MessageId);

            await _sensorReadingRepository.AddAsync(reading, cancellationToken);
            await _sensorReadingRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã lưu chỉ số cảm biến {SensorType} = {Value}{Unit} cho thiết bị {DeviceId}",
                reading.SensorType, reading.Value, reading.Unit, reading.DeviceId);

            return MapToDto(reading);
        }

        public async Task<int> RecordReadingsBatchAsync(
            IEnumerable<CreateSensorReadingRequest> requests,
            CancellationToken cancellationToken = default)
        {
            if (requests == null)
                throw new ArgumentNullException(nameof(requests));

            var requestList = requests.ToList();
            if (!requestList.Any())
                return 0;

            var receivedAtUtc = DateTimeOffset.UtcNow;
            var readingsToSave = new List<SensorReading>();

            foreach (var req in requestList)
            {
                var recordedAtUtc = req.RecordedAtUtc ?? receivedAtUtc;
                if (receivedAtUtc < recordedAtUtc)
                {
                    recordedAtUtc = receivedAtUtc;
                }

                var reading = new SensorReading(
                    req.DeviceId,
                    req.SensorType,
                    req.Value,
                    req.Unit,
                    recordedAtUtc,
                    receivedAtUtc,
                    req.MessageId);

                readingsToSave.Add(reading);
            }

            await _sensorReadingRepository.AddRangeAsync(readingsToSave, cancellationToken);
            var savedCount = await _sensorReadingRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã lưu batch {Count} chỉ số cảm biến vào CSDL.", savedCount);
            return savedCount;
        }

        public async Task<IReadOnlyList<SensorReadingDto>> GetLatestReadingsAsync(
            Guid deviceId,
            int count = 10,
            CancellationToken cancellationToken = default)
        {
            var readings = await _sensorReadingRepository.GetLatestByDeviceIdAsync(deviceId, count, cancellationToken);
            return readings.Select(MapToDto).ToList();
        }

        public async Task<SensorTelemetryDto> GetCurrentTelemetryAsync(
            Guid deviceId,
            CancellationToken cancellationToken = default)
        {
            var readings = await _sensorReadingRepository.GetLatestByDeviceIdAsync(deviceId, 30, cancellationToken);

            var latestSoil = readings.FirstOrDefault(r => r.SensorType == SensorType.SoilMoisture);
            var latestAirTemp = readings.FirstOrDefault(r => r.SensorType == SensorType.AirTemperature);
            var latestAirHum = readings.FirstOrDefault(r => r.SensorType == SensorType.AirHumidity);
            var latestWaterTemp = readings.FirstOrDefault(r => r.SensorType == SensorType.WaterTemperature);
            var latestWaterLevel = readings.FirstOrDefault(r => r.SensorType == SensorType.WaterLevel);

            var lastUpdated = readings.OrderByDescending(r => r.RecordedAtUtc).FirstOrDefault()?.RecordedAtUtc;

            return new SensorTelemetryDto
            {
                DeviceId = deviceId,
                SoilMoisture = latestSoil?.Value,
                AirTemperature = latestAirTemp?.Value,
                AirHumidity = latestAirHum?.Value,
                WaterTemperature = latestWaterTemp?.Value,
                WaterLevel = latestWaterLevel?.Value,
                LastUpdatedAtUtc = lastUpdated
            };
        }

        public async Task<SensorHistoryDto> GetSensorHistoryAsync(
            Guid deviceId,
            SensorType sensorType,
            DateTimeOffset fromUtc,
            DateTimeOffset toUtc,
            CancellationToken cancellationToken = default)
        {
            var readings = await _sensorReadingRepository.GetByDeviceIdAndRangeAsync(deviceId, sensorType, fromUtc, toUtc, cancellationToken);

            var unit = readings.FirstOrDefault()?.Unit ?? GetDefaultUnit(sensorType);
            var dataPoints = readings.Select(r => new SensorDataPointDto
            {
                Value = r.Value,
                TimestampUtc = r.RecordedAtUtc
            }).ToList();

            return new SensorHistoryDto
            {
                DeviceId = deviceId,
                SensorType = sensorType,
                Unit = unit,
                DataPoints = dataPoints
            };
        }

        public async Task<IReadOnlyList<SensorAggregateDto>> GetAggregatesAsync(
            Guid deviceId,
            SensorType? sensorType,
            DateTimeOffset fromUtc,
            DateTimeOffset toUtc,
            CancellationToken cancellationToken = default)
        {
            if (fromUtc > toUtc)
                throw new ArgumentException("fromUtc cannot be greater than toUtc.", nameof(fromUtc));

            var aggregates = await _aggregateRepository.GetAggregatesAsync(
                deviceId, sensorType, fromUtc, toUtc, cancellationToken);

            return aggregates.Select(a => new SensorAggregateDto
            {
                Id = a.Id,
                DeviceId = a.DeviceId,
                SensorType = a.SensorType,
                HourBucket = a.HourBucket,
                AvgValue = a.AvgValue,
                MinValue = a.MinValue,
                MaxValue = a.MaxValue,
                SampleCount = a.SampleCount,
                Unit = a.Unit,
                AggregatedAtUtc = a.AggregatedAtUtc
            }).ToList();
        }

        private static SensorReadingDto MapToDto(SensorReading entity)
        {
            return new SensorReadingDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                MessageId = entity.MessageId,
                SensorType = entity.SensorType,
                Value = entity.Value,
                Unit = entity.Unit,
                RecordedAtUtc = entity.RecordedAtUtc,
                ReceivedAtUtc = entity.ReceivedAtUtc
            };
        }

        private static string GetDefaultUnit(SensorType sensorType) => sensorType switch
        {
            SensorType.SoilMoisture => "%",
            SensorType.AirHumidity => "%",
            SensorType.AirTemperature => "°C",
            SensorType.WaterTemperature => "°C",
            SensorType.WaterLevel => "%",
            _ => string.Empty
        };
    }
}
