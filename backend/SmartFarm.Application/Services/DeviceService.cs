using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Triển khai dịch vụ quản lý thiết bị IoT có kiểm tra logic và xử lý ngoại lệ
    /// </summary>
    public class DeviceService : IDeviceService
    {
        private readonly IDeviceRepository _deviceRepository;

        public DeviceService(IDeviceRepository deviceRepository)
        {
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
        }

        public async Task<DeviceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var device = await _deviceRepository.GetByIdAsync(id, cancellationToken);
            return device is null ? null : MapToDto(device);
        }

        public async Task<DeviceDto?> GetByCodeAsync(string deviceCode, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(deviceCode))
                throw new ArgumentException("Mã thiết bị không được để trống.", nameof(deviceCode));

            var device = await _deviceRepository.GetByCodeAsync(deviceCode, cancellationToken);
            return device is null ? null : MapToDto(device);
        }

        public async Task<IReadOnlyList<DeviceDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var devices = await _deviceRepository.GetAllAsync(cancellationToken);
            return devices.Select(MapToDto).ToList();
        }

        public async Task<DeviceDto> CreateAsync(CreateDeviceRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null)
                throw new ArgumentNullException(nameof(request));

            if (request.OwnerId == Guid.Empty)
                throw new ArgumentException("Owner ID không được để trống.", nameof(request.OwnerId));

            if (string.IsNullOrWhiteSpace(request.DeviceCode))
                throw new ArgumentException("Mã thiết bị không được để trống.", nameof(request.DeviceCode));

            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Tên thiết bị không được để trống.", nameof(request.Name));

            var exists = await _deviceRepository.ExistsAsync(request.DeviceCode, cancellationToken);
            if (exists)
                throw new InvalidOperationException($"Thiết bị với mã '{request.DeviceCode}' đã tồn tại trong hệ thống.");

            var device = new Device(
                request.OwnerId,
                request.DeviceCode,
                request.Name,
                DateTimeOffset.UtcNow,
                request.Description);

            await _deviceRepository.AddAsync(device, cancellationToken);
            await _deviceRepository.SaveChangesAsync(cancellationToken);

            return MapToDto(device);
        }

        public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var device = await _deviceRepository.GetByIdAsync(id, cancellationToken);
            if (device is null)
                throw new DeviceNotFoundException(id);

            device.Deactivate(DateTimeOffset.UtcNow);
            await _deviceRepository.UpdateAsync(device, cancellationToken);
            await _deviceRepository.SaveChangesAsync(cancellationToken);
        }

        private static DeviceDto MapToDto(Device device)
        {
            return new DeviceDto
            {
                Id = device.Id,
                OwnerId = device.OwnerId,
                DeviceCode = device.DeviceCode,
                Name = device.Name,
                Description = device.Description,
                IsOnline = device.IsOnline,
                IsActive = device.IsActive,
                CreatedAtUtc = device.CreatedAtUtc,
                UpdatedAtUtc = device.UpdatedAtUtc,
                LastSeenAtUtc = device.LastSeenAtUtc
            };
        }
    }
}
