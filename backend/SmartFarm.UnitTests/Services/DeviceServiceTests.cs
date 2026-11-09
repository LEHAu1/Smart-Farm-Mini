using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Exceptions;
using Xunit;

namespace SmartFarm.UnitTests.Services
{
    public class DeviceServiceTests
    {
        private readonly Mock<IDeviceRepository> _mockDeviceRepo;
        private readonly DeviceService _deviceService;
        private readonly Guid _testOwnerId;

        public DeviceServiceTests()
        {
            _mockDeviceRepo = new Mock<IDeviceRepository>();
            _deviceService = new DeviceService(_mockDeviceRepo.Object);
            _testOwnerId = Guid.NewGuid();
        }

        [Fact]
        public async Task GetByIdAsync_WhenDeviceExists_ShouldReturnDeviceDto()
        {
            // Arrange
            var device = new Device(_testOwnerId, "ESP32-POT-001", "Chậu Cây Trầu Bà", DateTimeOffset.UtcNow);
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(device);

            // Act
            var result = await _deviceService.GetByIdAsync(device.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(device.Id, result.Id);
            Assert.Equal(_testOwnerId, result.OwnerId);
            Assert.Equal("ESP32-POT-001", result.DeviceCode);
            Assert.Equal("Chậu Cây Trầu Bà", result.Name);
            Assert.True(result.IsActive);
        }

        [Fact]
        public async Task GetByIdAsync_WhenDeviceDoesNotExist_ShouldReturnNull()
        {
            // Arrange
            var nonExistentId = Guid.NewGuid();
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(nonExistentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Device?)null);

            // Act
            var result = await _deviceService.GetByIdAsync(nonExistentId);

            // Assert
            Assert.Null(result);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public async Task GetByCodeAsync_WhenCodeIsEmpty_ShouldThrowArgumentException(string? invalidCode)
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _deviceService.GetByCodeAsync(invalidCode!));
        }

        [Fact]
        public async Task GetAllAsync_ShouldReturnAllDevicesMappedToDto()
        {
            // Arrange
            var list = new List<Device>
            {
                new Device(_testOwnerId, "ESP32-01", "Chậu 1", DateTimeOffset.UtcNow),
                new Device(_testOwnerId, "ESP32-02", "Chậu 2", DateTimeOffset.UtcNow)
            };
            _mockDeviceRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(list);

            // Act
            var result = await _deviceService.GetAllAsync();

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Contains(result, d => d.DeviceCode == "ESP32-01");
            Assert.Contains(result, d => d.DeviceCode == "ESP32-02");
        }

        [Fact]
        public async Task CreateAsync_WhenRequestIsNull_ShouldThrowArgumentNullException()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => _deviceService.CreateAsync(null!));
        }

        [Fact]
        public async Task CreateAsync_WhenOwnerIdIsEmpty_ShouldThrowArgumentException()
        {
            // Arrange
            var request = new CreateDeviceRequest
            {
                OwnerId = Guid.Empty,
                DeviceCode = "ESP32-NO-OWNER",
                Name = "Không có chủ"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _deviceService.CreateAsync(request));
            Assert.Contains("Owner ID không được để trống", ex.Message);
        }

        [Fact]
        public async Task CreateAsync_WhenDeviceCodeAlreadyExists_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var request = new CreateDeviceRequest
            {
                OwnerId = _testOwnerId,
                DeviceCode = "ESP32-DUPLICATE",
                Name = "Trùng mã"
            };

            _mockDeviceRepo.Setup(r => r.ExistsAsync("ESP32-DUPLICATE", It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _deviceService.CreateAsync(request));
            Assert.Contains("đã tồn tại trong hệ thống", ex.Message);
            _mockDeviceRepo.Verify(r => r.AddAsync(It.IsAny<Device>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_WhenValidRequest_ShouldCallRepositoryAndReturnDto()
        {
            // Arrange
            var request = new CreateDeviceRequest
            {
                OwnerId = _testOwnerId,
                DeviceCode = "ESP32-NEW",
                Name = "Chậu Sen Đá",
                Description = "Cây để bàn làm việc"
            };

            _mockDeviceRepo.Setup(r => r.ExistsAsync("ESP32-NEW", It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            // Act
            var result = await _deviceService.CreateAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("ESP32-NEW", result.DeviceCode);
            Assert.Equal(_testOwnerId, result.OwnerId);
            Assert.Equal("Chậu Sen Đá", result.Name);
            Assert.Equal("Cây để bàn làm việc", result.Description);
            Assert.True(result.IsActive);

            _mockDeviceRepo.Verify(r => r.AddAsync(It.IsAny<Device>(), It.IsAny<CancellationToken>()), Times.Once);
            _mockDeviceRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task DeactivateAsync_WhenDeviceNotFound_ShouldThrowDeviceNotFoundException()
        {
            // Arrange
            var nonExistentId = Guid.NewGuid();
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(nonExistentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Device?)null);

            // Act & Assert
            await Assert.ThrowsAsync<DeviceNotFoundException>(() => _deviceService.DeactivateAsync(nonExistentId));
            _mockDeviceRepo.Verify(r => r.UpdateAsync(It.IsAny<Device>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task DeactivateAsync_WhenDeviceExists_ShouldDeactivateAndUpdate()
        {
            // Arrange
            var device = new Device(_testOwnerId, "ESP32-DEACT", "Thiết bị sắp tắt", DateTimeOffset.UtcNow);
            Assert.True(device.IsActive);

            _mockDeviceRepo.Setup(r => r.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(device);

            // Act
            await _deviceService.DeactivateAsync(device.Id);

            // Assert
            Assert.False(device.IsActive);
            _mockDeviceRepo.Verify(r => r.UpdateAsync(device, It.IsAny<CancellationToken>()), Times.Once);
            _mockDeviceRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ActivateAsync_WhenDeviceExists_ShouldActivateAndUpdate()
        {
            // Arrange
            var device = new Device(_testOwnerId, "ESP32-ACT", "Thiết bị sắp bật", DateTimeOffset.UtcNow);
            device.Deactivate(DateTimeOffset.UtcNow);
            Assert.False(device.IsActive);

            _mockDeviceRepo.Setup(r => r.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(device);

            // Act
            await _deviceService.ActivateAsync(device.Id);

            // Assert
            Assert.True(device.IsActive);
            _mockDeviceRepo.Verify(r => r.UpdateAsync(device, It.IsAny<CancellationToken>()), Times.Once);
            _mockDeviceRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_WhenDeviceNotFound_ShouldThrowDeviceNotFoundException()
        {
            // Arrange
            var nonExistentId = Guid.NewGuid();
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(nonExistentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Device?)null);

            var request = new UpdateDeviceRequest { Name = "Tên mới" };

            // Act & Assert
            await Assert.ThrowsAsync<DeviceNotFoundException>(() => _deviceService.UpdateAsync(nonExistentId, _testOwnerId, false, request));
        }

        [Fact]
        public async Task UpdateAsync_WhenNotOwnerAndNotAdmin_ShouldThrowUnauthorizedAccessException()
        {
            // Arrange
            var device = new Device(_testOwnerId, "ESP32-OWN", "Chậu Cây", DateTimeOffset.UtcNow);
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(device);

            var strangerId = Guid.NewGuid();
            var request = new UpdateDeviceRequest { Name = "Hack Tên" };

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _deviceService.UpdateAsync(device.Id, strangerId, false, request));
        }

        [Fact]
        public async Task UpdateAsync_WhenOwner_ShouldUpdateDeviceSuccessfully()
        {
            // Arrange
            var device = new Device(_testOwnerId, "ESP32-OWN", "Chậu Cây Cũ", DateTimeOffset.UtcNow, "Mô tả cũ");
            _mockDeviceRepo.Setup(r => r.GetByIdAsync(device.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(device);

            var request = new UpdateDeviceRequest { Name = "Chậu Cây Mới", Description = "Mô tả mới" };

            // Act
            var result = await _deviceService.UpdateAsync(device.Id, _testOwnerId, false, request);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Chậu Cây Mới", result.Name);
            Assert.Equal("Mô tả mới", result.Description);
            _mockDeviceRepo.Verify(r => r.UpdateAsync(device, It.IsAny<CancellationToken>()), Times.Once);
            _mockDeviceRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetByOwnerIdAsync_ShouldReturnOwnerDevices()
        {
            // Arrange
            var list = new List<Device>
            {
                new Device(_testOwnerId, "ESP32-01", "Chậu 1", DateTimeOffset.UtcNow)
            };
            _mockDeviceRepo.Setup(r => r.GetByOwnerIdAsync(_testOwnerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(list);

            // Act
            var result = await _deviceService.GetByOwnerIdAsync(_testOwnerId);

            // Assert
            Assert.Single(result);
            Assert.Equal("ESP32-01", result[0].DeviceCode);
        }

        [Fact]
        public async Task GetPagedAsync_ShouldReturnPagedResult()
        {
            // Arrange
            var list = new List<Device>
            {
                new Device(_testOwnerId, "ESP32-01", "Chậu 1", DateTimeOffset.UtcNow)
            };
            _mockDeviceRepo.Setup(r => r.GetPagedAsync(_testOwnerId, "Chậu", true, true, 1, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync((list, 1));

            // Act
            var result = await _deviceService.GetPagedAsync(_testOwnerId, "Chậu", true, true, 1, 10);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result.Items);
            Assert.Equal(1, result.TotalCount);
            Assert.Equal(1, result.PageIndex);
            Assert.Equal(10, result.PageSize);
        }
    }
}
