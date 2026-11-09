using SmartFarm.Application.DTOs.Dashboard;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện xử lý số liệu tổng quan Dashboard hệ thống
    /// </summary>
    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default);
    }
}

