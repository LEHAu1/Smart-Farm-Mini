using SmartFarm.Domain.Entities;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ cảnh báo sự cố (Alert Repository)
    /// </summary>
    public interface IAlertRepository
    {
        Task<Alert?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Alert>> GetByDeviceIdAsync(Guid deviceId, bool? isResolved = null, int limit = 50, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Alert>> GetUnresolvedAlertsAsync(CancellationToken cancellationToken = default);
        Task AddAsync(Alert alert, CancellationToken cancellationToken = default);
        Task UpdateAsync(Alert alert, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
