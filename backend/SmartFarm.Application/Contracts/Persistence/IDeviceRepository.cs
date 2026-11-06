using SmartFarm.Domain.Entities;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ dữ liệu thiết bị IoT (Device Repository)
    /// </summary>
    public interface IDeviceRepository
    {
        Task<Device?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Device?> GetByCodeAsync(string deviceCode, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Device>> GetAllAsync(CancellationToken cancellationToken = default);
        Task AddAsync(Device device, CancellationToken cancellationToken = default);
        Task UpdateAsync(Device device, CancellationToken cancellationToken = default);
        Task DeleteAsync(Device device, CancellationToken cancellationToken = default);
        Task<bool> ExistsAsync(string deviceCode, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
