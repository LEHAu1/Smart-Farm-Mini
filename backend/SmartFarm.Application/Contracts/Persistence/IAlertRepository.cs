using SmartFarm.Domain.Entities;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;
using SmartFarm.Application.DTOs.Alert;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ cảnh báo sự cố (Alert Repository)
    /// </summary>
    public interface IAlertRepository
    {
        Task<PageResult<Alert>> GetPagedAsync(Guid? ownerId, Guid? deviceId, AlertSeverity? severity, bool? isResolved, PaginationParams pagination, CancellationToken cancellationToken = default);
        Task<AlertSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default);
        Task<Alert?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Alert>> GetByDeviceIdAsync(Guid deviceId, bool? isResolved = null, int limit = 50, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Alert>> GetUnresolvedAlertsAsync(CancellationToken cancellationToken = default);
        Task AddAsync(Alert alert, CancellationToken cancellationToken = default);
        Task UpdateAsync(Alert alert, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
