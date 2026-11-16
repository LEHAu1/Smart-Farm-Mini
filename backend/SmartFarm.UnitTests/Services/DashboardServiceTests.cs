using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using Xunit;

namespace SmartFarm.UnitTests.Services
{
    public class DashboardServiceTests
    {
        private readonly Mock<IDeviceRepository> _mockDeviceRepo;
        private readonly Mock<ISensorReadingRepository> _mockSensorRepo;
        private readonly Mock<IIrrigationLogRepository> _mockIrrigationRepo;
        private readonly Mock<IAlertRepository> _mockAlertRepo;
        private readonly DashboardService _dashboardService;
        private readonly Guid _testOwnerId;

        public DashboardServiceTests()
        {
            _mockDeviceRepo = new Mock<IDeviceRepository>();
            _mockSensorRepo = new Mock<ISensorReadingRepository>();
            _mockIrrigationRepo = new Mock<IIrrigationLogRepository>();
            _mockAlertRepo = new Mock<IAlertRepository>();

            _dashboardService = new DashboardService(
                _mockDeviceRepo.Object,
                _mockSensorRepo.Object,
                _mockIrrigationRepo.Object,
                _mockAlertRepo.Object);

            _testOwnerId = Guid.NewGuid();
        }

        [Fact]
        public async Task GetSummaryAsync_ShouldReturnAggregatedMetrics()
        {
            // Arrange
            var now = DateTimeOffset.UtcNow;
            var device1 = new Device(_testOwnerId, "ESP32-01", "Chậu 1", now);
            device1.MarkOnline(now);
            var device2 = new Device(_testOwnerId, "ESP32-02", "Chậu 2", now);

            var devices = new List<Device> { device1, device2 };

            _mockDeviceRepo.Setup(r => r.GetByOwnerIdAsync(_testOwnerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(devices);

            _mockIrrigationRepo.Setup(r => r.GetCurrentInProgressByDeviceIdsAsync(
                    It.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<IrrigationLog> { new(device1.Id, IrrigationMode.Automatic, now, 40) });

            _mockIrrigationRepo.Setup(r => r.GetRecentByDeviceIdsAsync(
                    It.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2), 5, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<IrrigationLog>());

            _mockSensorRepo.Setup(r => r.GetLatestByDeviceIdsAsync(
                    It.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2), 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<SensorReading>
                {
                    new SensorReading(device1.Id, SensorType.SoilMoisture, 65.5m, "%", now, now),
                    new SensorReading(device1.Id, SensorType.AirTemperature, 28.0m, "°C", now, now),
                    new SensorReading(device1.Id, SensorType.AirHumidity, 70.0m, "%", now, now),
                    new SensorReading(device1.Id, SensorType.WaterTemperature, 26.0m, "°C", now, now),
                    new SensorReading(device1.Id, SensorType.WaterLevel, 85.0m, "%", now, now)
                });

            _mockAlertRepo.Setup(r => r.GetUnresolvedAlertsAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Alert>
                {
                    new Alert(device1.Id, "LOW_SOIL_MOISTURE", "Cảnh báo", "Độ ẩm thấp", AlertSeverity.Warning, now)
                });

            // Act
            var result = await _dashboardService.GetSummaryAsync(_testOwnerId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Devices.TotalDevices);
            Assert.Equal(1, result.Devices.OnlineDevices);
            Assert.Equal(1, result.Devices.OfflineDevices);
            Assert.Equal(1, result.Devices.ActiveIrrigatingDevices);

            Assert.Equal(65.5m, result.Sensors.AverageSoilMoisture);
            Assert.Equal(28.0m, result.Sensors.AverageAirTemperature);
            Assert.Equal(70.0m, result.Sensors.AverageAirHumidity);
            Assert.Equal(26.0m, result.Sensors.AverageWaterTemperature);
            Assert.Equal(85.0m, result.Sensors.AverageWaterLevel);

            Assert.Single(result.RecentAlerts);
            Assert.Equal("Độ ẩm thấp", result.RecentAlerts[0].Message);

            _mockIrrigationRepo.Verify(r => r.GetCurrentInProgressByDeviceIdsAsync(
                It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()), Times.Once);
            _mockIrrigationRepo.Verify(r => r.GetRecentByDeviceIdsAsync(
                It.IsAny<IReadOnlyCollection<Guid>>(), 5, It.IsAny<CancellationToken>()), Times.Once);
            _mockSensorRepo.Verify(r => r.GetLatestByDeviceIdsAsync(
                It.IsAny<IReadOnlyCollection<Guid>>(), 10, It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
