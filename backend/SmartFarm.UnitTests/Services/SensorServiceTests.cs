using Microsoft.Extensions.Logging;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.UnitTests.Services
{
    public class SensorServiceTests
    {
        private readonly Mock<ISensorReadingRepository> _sensorRepoMock;
        private readonly Mock<IDeviceRepository> _deviceRepoMock;
        private readonly Mock<ILogger<SensorService>> _loggerMock;
        private readonly SensorService _service;

        // Thiết bị mẫu để sử dụng trong test
        private static readonly Guid DeviceId = Guid.NewGuid();
        private static readonly DateTimeOffset NowUtc = DateTimeOffset.UtcNow;

        public SensorServiceTests()
        {
            _sensorRepoMock = new Mock<ISensorReadingRepository>();
            _deviceRepoMock = new Mock<IDeviceRepository>();
            _loggerMock = new Mock<ILogger<SensorService>>();

            _service = new SensorService(
                _sensorRepoMock.Object,
                _deviceRepoMock.Object,
                _loggerMock.Object);
        }

        // ── Helpers ───────────────────────────────────────────────────

        private static Device CreateActiveDevice()
        {
            var device = new Device(
                Guid.NewGuid(),
                "FARM-001",
                "Test Sensor Node",
                NowUtc);
            return device;
        }

        private static SensorReading CreateReading(SensorType type = SensorType.SoilMoisture, decimal value = 50m)
        {
            return new SensorReading(
                DeviceId,
                type,
                value,
                "%",
                NowUtc,
                NowUtc);
        }

        // ── RecordReadingAsync ────────────────────────────────────────

        [Fact]
        public async Task RecordReadingAsync_ValidRequest_ReturnsDto()
        {
            // Arrange
            var device = CreateActiveDevice();
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _sensorRepoMock
                .Setup(r => r.AddAsync(It.IsAny<SensorReading>(), default))
                .Returns(Task.CompletedTask);
            _sensorRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new CreateSensorReadingRequest
            {
                DeviceId = DeviceId,
                SensorType = SensorType.SoilMoisture,
                Value = 55m,
                Unit = "%",
                RecordedAtUtc = NowUtc
            };

            // Act
            var result = await _service.RecordReadingAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(DeviceId, result.DeviceId);
            Assert.Equal(SensorType.SoilMoisture, result.SensorType);
            Assert.Equal(55m, result.Value);
            Assert.Equal("%", result.Unit);
        }

        [Fact]
        public async Task RecordReadingAsync_DeviceNotFound_ThrowsDeviceNotFoundException()
        {
            // Arrange
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync((Device?)null);

            var request = new CreateSensorReadingRequest
            {
                DeviceId = DeviceId,
                SensorType = SensorType.AirTemperature,
                Value = 30m,
                Unit = "°C"
            };

            // Act & Assert
            await Assert.ThrowsAsync<DeviceNotFoundException>(
                () => _service.RecordReadingAsync(request));
        }

        [Fact]
        public async Task RecordReadingAsync_NullRequest_ThrowsArgumentNullException()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(
                () => _service.RecordReadingAsync(null!));
        }

        // ── RecordReadingsBatchAsync ───────────────────────────────────

        [Fact]
        public async Task RecordReadingsBatchAsync_ValidBatch_ReturnsSavedCount()
        {
            // Arrange
            _sensorRepoMock
                .Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<SensorReading>>(), default))
                .Returns(Task.CompletedTask);
            _sensorRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(3);

            var requests = new List<CreateSensorReadingRequest>
            {
                new() { DeviceId = DeviceId, SensorType = SensorType.SoilMoisture,    Value = 45m, Unit = "%",  RecordedAtUtc = NowUtc },
                new() { DeviceId = DeviceId, SensorType = SensorType.AirTemperature,  Value = 28m, Unit = "°C", RecordedAtUtc = NowUtc },
                new() { DeviceId = DeviceId, SensorType = SensorType.AirHumidity,     Value = 70m, Unit = "%",  RecordedAtUtc = NowUtc },
            };

            // Act
            var count = await _service.RecordReadingsBatchAsync(requests);

            // Assert
            Assert.Equal(3, count);
        }

        [Fact]
        public async Task RecordReadingsBatchAsync_EmptyList_ReturnsZero()
        {
            // Act
            var count = await _service.RecordReadingsBatchAsync(new List<CreateSensorReadingRequest>());

            // Assert
            Assert.Equal(0, count);
            _sensorRepoMock.Verify(r => r.AddRangeAsync(It.IsAny<IEnumerable<SensorReading>>(), default), Times.Never);
        }

        // ── GetCurrentTelemetryAsync ──────────────────────────────────

        [Fact]
        public async Task GetCurrentTelemetryAsync_WithReadings_ReturnsTelemetryDto()
        {
            // Arrange
            var readings = new List<SensorReading>
            {
                CreateReading(SensorType.SoilMoisture,   55m),
                CreateReading(SensorType.AirTemperature, 28m),
                CreateReading(SensorType.AirHumidity,    72m),
                CreateReading(SensorType.WaterLevel,     80m),
            };

            _sensorRepoMock
                .Setup(r => r.GetLatestByDeviceIdAsync(DeviceId, 30, default))
                .ReturnsAsync(readings);

            // Act
            var telemetry = await _service.GetCurrentTelemetryAsync(DeviceId);

            // Assert
            Assert.Equal(DeviceId, telemetry.DeviceId);
            Assert.Equal(55m, telemetry.SoilMoisture);
            Assert.Equal(28m, telemetry.AirTemperature);
            Assert.Equal(72m, telemetry.AirHumidity);
            Assert.Null(telemetry.WaterTemperature);
            Assert.Equal(80m, telemetry.WaterLevel);
        }

        [Fact]
        public async Task GetCurrentTelemetryAsync_NoReadings_ReturnsEmptyTelemetry()
        {
            // Arrange
            _sensorRepoMock
                .Setup(r => r.GetLatestByDeviceIdAsync(DeviceId, 30, default))
                .ReturnsAsync(new List<SensorReading>());

            // Act
            var telemetry = await _service.GetCurrentTelemetryAsync(DeviceId);

            // Assert
            Assert.Equal(DeviceId, telemetry.DeviceId);
            Assert.Null(telemetry.SoilMoisture);
            Assert.Null(telemetry.AirTemperature);
            Assert.Null(telemetry.LastUpdatedAtUtc);
        }

        // ── GetSensorHistoryAsync ─────────────────────────────────────

        [Fact]
        public async Task GetSensorHistoryAsync_ReturnsHistoryDto()
        {
            // Arrange
            var from = NowUtc.AddHours(-24);
            var readings = new List<SensorReading>
            {
                CreateReading(SensorType.SoilMoisture, 40m),
                CreateReading(SensorType.SoilMoisture, 50m),
            };

            _sensorRepoMock
                .Setup(r => r.GetByDeviceIdAndRangeAsync(DeviceId, SensorType.SoilMoisture, from, NowUtc, default))
                .ReturnsAsync(readings);

            // Act
            var history = await _service.GetSensorHistoryAsync(DeviceId, SensorType.SoilMoisture, from, NowUtc);

            // Assert
            Assert.Equal(DeviceId, history.DeviceId);
            Assert.Equal(SensorType.SoilMoisture, history.SensorType);
            Assert.Equal(2, history.DataPoints.Count);
        }
    }
}
