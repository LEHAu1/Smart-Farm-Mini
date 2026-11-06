using SmartFarm.Application.DTOs.Device;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện xử lý nghiệp vụ thiết bị IoT (Use Cases)
    /// </summary>
    public interface IDeviceService
    {
        Task<DeviceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<DeviceDto?> GetByCodeAsync(string deviceCode, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<DeviceDto>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<DeviceDto> CreateAsync(CreateDeviceRequest request, CancellationToken cancellationToken = default);
        Task DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
