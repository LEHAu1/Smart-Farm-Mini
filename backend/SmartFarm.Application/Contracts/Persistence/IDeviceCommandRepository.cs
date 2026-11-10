using SmartFarm.Domain.Entities;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ lệnh điều khiển thiết bị (DeviceCommand Repository)
    /// </summary>
    public interface IDeviceCommandRepository
    {
        Task<PageResult<DeviceCommand>> GetPagedAsync(Guid? ownerId, Guid? deviceId, CommandStatus? status, PaginationParams pagination, CancellationToken cancellationToken = default);
        Task<DeviceCommand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<DeviceCommand?> GetByCommandCodeAsync(string commandCode, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<DeviceCommand>> GetPendingCommandsByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<DeviceCommand>> GetRecentByDeviceIdAsync(Guid deviceId, int limit = 20, CancellationToken cancellationToken = default);
        Task AddAsync(DeviceCommand command, CancellationToken cancellationToken = default);
        Task UpdateAsync(DeviceCommand command, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
