using Microsoft.Extensions.Logging;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.UnitTests.Services
{
    public class IrrigationServiceTests
    {
        private readonly Mock<IIrrigationRuleRepository> _ruleRepoMock;
        private readonly Mock<IIrrigationLogRepository> _logRepoMock;
        private readonly Mock<IDeviceRepository> _deviceRepoMock;
        private readonly Mock<ILogger<IrrigationService>> _loggerMock;
        private readonly IrrigationService _service;

        private static readonly Guid DeviceId = Guid.NewGuid();
        private static readonly DateTimeOffset NowUtc = DateTimeOffset.UtcNow;

        public IrrigationServiceTests()
        {
            _ruleRepoMock = new Mock<IIrrigationRuleRepository>();
            _logRepoMock = new Mock<IIrrigationLogRepository>();
            _deviceRepoMock = new Mock<IDeviceRepository>();
            _loggerMock = new Mock<ILogger<IrrigationService>>();

            _service = new IrrigationService(
                _ruleRepoMock.Object,
                _logRepoMock.Object,
                _deviceRepoMock.Object,
                _loggerMock.Object);
        }

        private static Device CreateActiveDevice()
        {
            return new Device(Guid.NewGuid(), "FARM-001", "Irrigation Controller", NowUtc);
        }

        private static IrrigationRule CreateRule()
        {
            return new IrrigationRule(
                DeviceId,
                "Auto Water Morning",
                30.0m,
                60.0m,
                30,
                300,
                NowUtc);
        }

        private static IrrigationLog CreateLog(bool completed = false)
        {
            var log = new IrrigationLog(
                DeviceId,
                IrrigationMode.Automatic,
                NowUtc,
                25.0m);

            if (completed)
            {
                log.Complete(NowUtc.AddMinutes(2), 65.0m, 500);
            }

            return log;
        }

        // ── Rule Tests ────────────────────────────────────────────────

        [Fact]
        public async Task CreateRuleAsync_ValidRequest_ReturnsDto()
        {
            // Arrange
            var device = CreateActiveDevice();
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _ruleRepoMock
                .Setup(r => r.AddAsync(It.IsAny<IrrigationRule>(), default))
                .Returns(Task.CompletedTask);
            _ruleRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new CreateIrrigationRuleRequest
            {
                DeviceId = DeviceId,
                Name = "Auto Water Morning",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = 30,
                MaxDurationSeconds = 300
            };

            // Act
            var result = await _service.CreateRuleAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(DeviceId, result.DeviceId);
            Assert.Equal("Auto Water Morning", result.Name);
            Assert.Equal(30.0m, result.MoistureThreshold);
            Assert.Equal(60.0m, result.TargetMoisture);
            Assert.True(result.IsEnabled);
        }

        [Fact]
        public async Task CreateRuleAsync_DeviceNotFound_ThrowsDeviceNotFoundException()
        {
            // Arrange
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync((Device?)null);

            var request = new CreateIrrigationRuleRequest
            {
                DeviceId = DeviceId,
                Name = "Auto Water",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = 30,
                MaxDurationSeconds = 300
            };

            // Act & Assert
            await Assert.ThrowsAsync<DeviceNotFoundException>(
                () => _service.CreateRuleAsync(request));
        }

        [Fact]
        public async Task UpdateRuleAsync_ExistingRule_ReturnsUpdatedDto()
        {
            // Arrange
            var rule = CreateRule();
            _ruleRepoMock
                .Setup(r => r.GetByIdAsync(rule.Id, default))
                .ReturnsAsync(rule);
            _ruleRepoMock
                .Setup(r => r.UpdateAsync(It.IsAny<IrrigationRule>(), default))
                .Returns(Task.CompletedTask);
            _ruleRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Updated Rule",
                MoistureThreshold = 35.0m,
                TargetMoisture = 70.0m,
                MinIntervalMinutes = 45,
                MaxDurationSeconds = 400
            };

            // Act
            var result = await _service.UpdateRuleAsync(rule.Id, request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Updated Rule", result.Name);
            Assert.Equal(35.0m, result.MoistureThreshold);
            Assert.Equal(70.0m, result.TargetMoisture);
        }

        [Fact]
        public async Task UpdateRuleAsync_NotFound_ThrowsKeyNotFoundException()
        {
            // Arrange
            var ruleId = Guid.NewGuid();
            _ruleRepoMock
                .Setup(r => r.GetByIdAsync(ruleId, default))
                .ReturnsAsync((IrrigationRule?)null);

            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Updated Rule",
                MoistureThreshold = 35.0m,
                TargetMoisture = 70.0m,
                MinIntervalMinutes = 45,
                MaxDurationSeconds = 400
            };

            // Act & Assert
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _service.UpdateRuleAsync(ruleId, request));
        }

        [Fact]
        public async Task ToggleRuleAsync_EnablesAndDisablesRule()
        {
            // Arrange
            var rule = CreateRule();
            _ruleRepoMock
                .Setup(r => r.GetByIdAsync(rule.Id, default))
                .ReturnsAsync(rule);
            _ruleRepoMock
                .Setup(r => r.UpdateAsync(rule, default))
                .Returns(Task.CompletedTask);
            _ruleRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act: Disable
            var disabled = await _service.ToggleRuleAsync(rule.Id, false);
            Assert.False(disabled.IsEnabled);

            // Act: Enable
            var enabled = await _service.ToggleRuleAsync(rule.Id, true);
            Assert.True(enabled.IsEnabled);
        }

        [Fact]
        public async Task DeleteRuleAsync_ExistingRule_CallsDelete()
        {
            // Arrange
            var rule = CreateRule();
            _ruleRepoMock
                .Setup(r => r.GetByIdAsync(rule.Id, default))
                .ReturnsAsync(rule);
            _ruleRepoMock
                .Setup(r => r.DeleteAsync(rule, default))
                .Returns(Task.CompletedTask);
            _ruleRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act
            await _service.DeleteRuleAsync(rule.Id);

            // Assert
            _ruleRepoMock.Verify(r => r.DeleteAsync(rule, default), Times.Once);
        }

        // ── Irrigation Log Tests ──────────────────────────────────────

        [Fact]
        public async Task StartIrrigationAsync_ValidDevice_StartsLog()
        {
            // Arrange
            var device = CreateActiveDevice();
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _logRepoMock
                .Setup(r => r.GetCurrentInProgressByDeviceIdAsync(DeviceId, default))
                .ReturnsAsync((IrrigationLog?)null);
            _logRepoMock
                .Setup(r => r.AddAsync(It.IsAny<IrrigationLog>(), default))
                .Returns(Task.CompletedTask);
            _logRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new CreateIrrigationLogRequest
            {
                DeviceId = DeviceId,
                Mode = IrrigationMode.Manual,
                SoilMoistureBefore = 28.5m
            };

            // Act
            var result = await _service.StartIrrigationAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(DeviceId, result.DeviceId);
            Assert.Equal(IrrigationMode.Manual, result.Mode);
            Assert.Equal(28.5m, result.SoilMoistureBefore);
            Assert.Equal(IrrigationStatus.InProgress, result.Status);
        }

        [Fact]
        public async Task StartIrrigationAsync_AlreadyRunning_ReturnsExistingLog()
        {
            // Arrange
            var device = CreateActiveDevice();
            var existingLog = CreateLog(completed: false);
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _logRepoMock
                .Setup(r => r.GetCurrentInProgressByDeviceIdAsync(DeviceId, default))
                .ReturnsAsync(existingLog);

            var request = new CreateIrrigationLogRequest
            {
                DeviceId = DeviceId,
                Mode = IrrigationMode.Automatic,
                SoilMoistureBefore = 20.0m
            };

            // Act
            var result = await _service.StartIrrigationAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(existingLog.Id, result.Id);
            _logRepoMock.Verify(r => r.AddAsync(It.IsAny<IrrigationLog>(), default), Times.Never);
        }

        [Fact]
        public async Task CompleteIrrigationAsync_ExistingLog_CompletesSuccessfully()
        {
            // Arrange
            var log = CreateLog(completed: false);
            _logRepoMock
                .Setup(r => r.GetByIdAsync(log.Id, default))
                .ReturnsAsync(log);
            _logRepoMock
                .Setup(r => r.UpdateAsync(log, default))
                .Returns(Task.CompletedTask);
            _logRepoMock
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            var request = new CompleteIrrigationLogRequest
            {
                SoilMoistureAfter = 65.0m,
                WaterAmountMl = 500
            };

            // Act
            var result = await _service.CompleteIrrigationAsync(log.Id, request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(IrrigationStatus.Completed, result.Status);
            Assert.Equal(65.0m, result.SoilMoistureAfter);
            Assert.Equal(500, result.WaterAmountMl);
            Assert.NotNull(result.CompletedAtUtc);
        }

        [Fact]
        public async Task GetCurrentStatusAsync_RunningPump_ReturnsIsPumpRunningTrue()
        {
            // Arrange
            var inProgressLog = CreateLog(completed: false);
            _logRepoMock
                .Setup(r => r.GetCurrentInProgressByDeviceIdAsync(DeviceId, default))
                .ReturnsAsync(inProgressLog);

            // Act
            var status = await _service.GetCurrentStatusAsync(DeviceId);

            // Assert
            Assert.NotNull(status);
            Assert.True(status.IsPumpRunning);
            Assert.Equal(DeviceId, status.DeviceId);
        }

        [Fact]
        public async Task CreateRuleAsync_WhenActiveRuleExists_ThrowsInvalidOperationException()
        {
            // Arrange
            var device = CreateActiveDevice();
            var existingRule = CreateRule();
            _deviceRepoMock
                .Setup(r => r.GetByIdAsync(DeviceId, default))
                .ReturnsAsync(device);
            _ruleRepoMock
                .Setup(r => r.GetActiveRuleByDeviceIdAsync(DeviceId, default))
                .ReturnsAsync(existingRule);

            var request = new CreateIrrigationRuleRequest
            {
                DeviceId = DeviceId,
                Name = "Duplicate Active Rule",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = 15,
                MaxDurationSeconds = 120
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreateRuleAsync(request));
        }

        [Fact]
        public async Task GetLogsPagedAsync_ReturnsPageResultWithFilteredItems()
        {
            // Arrange
            var logs = new List<IrrigationLog> { CreateLog(completed: true) };
            _logRepoMock
                .Setup(r => r.GetPagedAsync(null, DeviceId, IrrigationMode.Automatic, 1, 20, default))
                .ReturnsAsync((logs, 1));

            // Act
            var result = await _service.GetLogsPagedAsync(null, DeviceId, IrrigationMode.Automatic, 1, 20);

            // Assert
            Assert.Equal(1, result.TotalCount);
            Assert.Single(result.Items);
            Assert.Equal(IrrigationMode.Automatic, result.Items[0].Mode);
        }

        [Fact]
        public async Task GetLogByIdAsync_ExistingLog_ReturnsDto()
        {
            var log = CreateLog(completed: true);
            _logRepoMock
                .Setup(r => r.GetByIdAsync(log.Id, default))
                .ReturnsAsync(log);

            var result = await _service.GetLogByIdAsync(log.Id);

            Assert.NotNull(result);
            Assert.Equal(log.Id, result.Id);
            Assert.Equal(DeviceId, result.DeviceId);
        }

        [Fact]
        public async Task GetLogByIdAsync_NonExistingLog_ReturnsNull()
        {
            var logId = Guid.NewGuid();
            _logRepoMock
                .Setup(r => r.GetByIdAsync(logId, default))
                .ReturnsAsync((IrrigationLog?)null);

            var result = await _service.GetLogByIdAsync(logId);

            Assert.Null(result);
        }
    }
}
