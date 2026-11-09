using Microsoft.Extensions.Logging;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.UnitTests.Services
{
    public class AlertServiceTests
    {
        private readonly Mock<IAlertRepository> _alertRepoMock;
        private readonly Mock<IDeviceRepository> _deviceRepoMock;
        private readonly Mock<ILogger<AlertService>> _loggerMock;
        private readonly AlertService _service;

        private static readonly Guid DeviceId = Guid.NewGuid();
        private static readonly DateTimeOffset NowUtc = DateTimeOffset.UtcNow;

        public AlertServiceTests()
        {
            _alertRepoMock = new Mock<IAlertRepository>();
            _deviceRepoMock = new Mock<IDeviceRepository>();
            _loggerMock = new Mock<ILogger<AlertService>>();

            _service = new AlertService(
                _alertRepoMock.Object,
                _deviceRepoMock.Object,
                _loggerMock.Object);
        }

        // ── Helpers ───────────────────────────────────────────────────

        private static Device CreateActiveDevice()
        {
            return new Device(Guid.NewGuid(), "FARM-001", "Test Device", NowUtc);
        }

        private static Alert CreateAlert(bool resolved = false)
        {
            var alert = new Alert(
                DeviceId,
                "LOW_SOIL_MOISTURE",
                "Độ ẩm đất thấp",
                "Độ ẩm đất dưới ngưỡng an toàn 30%",
                AlertSeverity.Warning,
                NowUtc);

            if (resolved)
                alert.Resolve(NowUtc.AddMinutes(5));

            return alert;
        }

        // ── CreateAlertAsync ──────────────────────────────────────────

        [Fact]
        public async Task CreateAlertAsync_ValidRequest_ReturnsAlertDto()
        {
            // Arrange
            var device = CreateActiveDevice();
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _alertRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Alert>(), default))
                .Returns(Task.CompletedTask);
            _alertRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new CreateAlertRequest
            {
                DeviceId = DeviceId,
                AlertCode = "LOW_SOIL_MOISTURE",
                Title = "Độ ẩm đất thấp",
                Message = "Độ ẩm đất dưới ngưỡng an toàn 30%",
                Severity = AlertSeverity.Warning
            };

            // Act
            var result = await _service.CreateAlertAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(DeviceId, result.DeviceId);
            Assert.Equal("LOW_SOIL_MOISTURE", result.AlertCode);
            Assert.Equal(AlertSeverity.Warning, result.Severity);
            Assert.False(result.IsResolved);
        }

        [Fact]
        public async Task CreateAlertAsync_DeviceNotFound_ThrowsDeviceNotFoundException()
        {
            // Arrange
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync((Device?)null);

            var request = new CreateAlertRequest
            {
                DeviceId = DeviceId,
                AlertCode = "LOW_WATER_LEVEL",
                Title = "Mực nước thấp",
                Message = "Mực nước trong bồn chứa thấp",
                Severity = AlertSeverity.Critical
            };

            // Act & Assert
            await Assert.ThrowsAsync<DeviceNotFoundException>(
                () => _service.CreateAlertAsync(request));
        }

        [Fact]
        public async Task CreateAlertAsync_NullRequest_ThrowsArgumentNullException()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(
                () => _service.CreateAlertAsync(null!));
        }

        // ── ResolveAlertAsync ─────────────────────────────────────────

        [Fact]
        public async Task ResolveAlertAsync_ExistingAlert_ReturnsResolvedDto()
        {
            // Arrange
            var alert = CreateAlert(resolved: false);
            _alertRepoMock
                .Setup(r => r.GetByIdAsync(alert.Id, default))
                .ReturnsAsync(alert);
            _alertRepoMock
                .Setup(r => r.UpdateAsync(It.IsAny<Alert>(), default))
                .Returns(Task.CompletedTask);
            _alertRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act
            var result = await _service.ResolveAlertAsync(alert.Id);

            // Assert
            Assert.NotNull(result);
            Assert.True(result.IsResolved);
            Assert.NotNull(result.ResolvedAtUtc);
        }

        [Fact]
        public async Task ResolveAlertAsync_AlertNotFound_ThrowsKeyNotFoundException()
        {
            // Arrange
            var alertId = Guid.NewGuid();
            _alertRepoMock
                .Setup(r => r.GetByIdAsync(alertId, default))
                .ReturnsAsync((Alert?)null);

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.ResolveAlertAsync(alertId));
        }

        [Fact]
        public async Task ResolveAlertAsync_AlreadyResolved_ThrowsInvalidOperationException()
        {
            // Arrange
            var alert = CreateAlert(resolved: true);
            _alertRepoMock
                .Setup(r => r.GetByIdAsync(alert.Id, default))
                .ReturnsAsync(alert);

            // Act & Assert — Alert.Resolve() throws InvalidOperationException if already resolved
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.ResolveAlertAsync(alert.Id));
        }

        // ── GetUnresolvedAlertsAsync ──────────────────────────────────

        [Fact]
        public async Task GetUnresolvedAlertsAsync_ReturnsListOfDtos()
        {
            // Arrange
            var alerts = new List<Alert>
            {
                CreateAlert(resolved: false),
                CreateAlert(resolved: false)
            };
            _alertRepoMock
                .Setup(r => r.GetUnresolvedAlertsAsync(default))
                .ReturnsAsync(alerts);

            // Act
            var result = await _service.GetUnresolvedAlertsAsync();

            // Assert
            Assert.Equal(2, result.Count);
            Assert.All(result, a => Assert.False(a.IsResolved));
        }
    }
}
