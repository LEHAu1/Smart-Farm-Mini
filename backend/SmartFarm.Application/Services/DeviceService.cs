using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
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

        public async Task<IReadOnlyList<DeviceDto>> GetByOwnerIdAsync(Guid ownerId, CancellationToken cancellationToken = default)
        {
            var devices = await _deviceRepository.GetByOwnerIdAsync(ownerId, cancellationToken);
            return devices.Select(MapToDto).ToList();
        }

        public async Task<PageResult<DeviceDto>> GetPagedAsync(
            Guid? ownerId,
            string? keyword,
            bool? isOnline,
            bool? isActive,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var (items, totalCount) = await _deviceRepository.GetPagedAsync(
                ownerId, keyword, isOnline, isActive, pageNumber, pageSize, cancellationToken);

            var dtos = items.Select(MapToDto).ToList();
            return new PageResult<DeviceDto>(dtos, totalCount, pageNumber, pageSize);
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

        public async Task<DeviceDto> UpdateAsync(
            Guid id,
            Guid currentUserId,
            bool isAdmin,
            UpdateDeviceRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request is null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Tên thiết bị không được để trống.", nameof(request.Name));

            var device = await _deviceRepository.GetByIdAsync(id, cancellationToken);
            if (device is null)
                throw new DeviceNotFoundException(id);

            // Kiểm tra quyền sở hữu
            if (!isAdmin && device.OwnerId != currentUserId)
                throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa thiết bị của tài khoản khác.");

            device.UpdateInformation(request.Name, request.Description, DateTimeOffset.UtcNow);

            await _deviceRepository.UpdateAsync(device, cancellationToken);
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

        public async Task ActivateAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var device = await _deviceRepository.GetByIdAsync(id, cancellationToken);
            if (device is null)
                throw new DeviceNotFoundException(id);

            device.Activate(DateTimeOffset.UtcNow);

            await _deviceRepository.UpdateAsync(device, cancellationToken);
            await _deviceRepository.SaveChangesAsync(cancellationToken);
        }

        private static DeviceDto MapToDto(Device entity)
        {
            return new DeviceDto
            {
                Id = entity.Id,
                OwnerId = entity.OwnerId,
                DeviceCode = entity.DeviceCode,
                Name = entity.Name,
                Description = entity.Description,
                IsOnline = entity.IsOnline,
                IsActive = entity.IsActive,
                CreatedAtUtc = entity.CreatedAtUtc,
                UpdatedAtUtc = entity.UpdatedAtUtc,
                LastSeenAtUtc = entity.LastSeenAtUtc
            };
        }
    }
}
