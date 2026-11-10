using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện dịch vụ nghiệp vụ cảnh báo (Alert Service)
    /// </summary>
    public interface IAlertService
    {
        Task<PageResult<AlertDto>> GetPagedAsync(Guid? ownerId, Guid? deviceId, AlertSeverity? severity, bool? isResolved, PaginationParams pagination, CancellationToken cancellationToken = default);
        Task<AlertSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default);
        Task<AlertDto> CreateAlertAsync(CreateAlertRequest request, CancellationToken cancellationToken = default);
        Task<AlertDto?> GetByIdAsync(Guid alertId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<AlertDto>> GetByDeviceIdAsync(Guid deviceId, bool? isResolved = null, int limit = 50, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<AlertDto>> GetUnresolvedAlertsAsync(CancellationToken cancellationToken = default);
        Task<AlertDto> ResolveAlertAsync(Guid alertId, CancellationToken cancellationToken = default);
    }
}
