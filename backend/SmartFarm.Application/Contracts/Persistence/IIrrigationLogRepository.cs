using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ nhật ký tưới nước (IrrigationLog Repository)
    /// </summary>
    public interface IIrrigationLogRepository
    {
        Task<IrrigationLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationLog>> GetByDeviceIdAsync(Guid deviceId, int limit = 20, CancellationToken cancellationToken = default);
        Task<(IReadOnlyList<IrrigationLog> Items, int TotalCount)> GetPagedAsync(
            Guid? ownerId,
            Guid? deviceId,
            IrrigationMode? mode,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default);
        Task<IrrigationLog?> GetLatestByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IrrigationLog?> GetCurrentInProgressByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationLog>> GetCurrentInProgressByDeviceIdsAsync(IReadOnlyCollection<Guid> deviceIds, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationLog>> GetRecentByDeviceIdsAsync(IReadOnlyCollection<Guid> deviceIds, int limitPerDevice, CancellationToken cancellationToken = default);
        Task AddAsync(IrrigationLog log, CancellationToken cancellationToken = default);
        Task UpdateAsync(IrrigationLog log, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
