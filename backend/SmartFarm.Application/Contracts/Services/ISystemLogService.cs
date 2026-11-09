using SmartFarm.Application.DTOs.SystemLog;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện dịch vụ nghiệp vụ nhật ký hệ thống (SystemLog Service)
    /// </summary>
    public interface ISystemLogService
    {
        Task<SystemLogDto> LogAsync(CreateSystemLogRequest request, CancellationToken cancellationToken = default);
        Task<SystemLogDto?> GetByIdAsync(Guid logId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SystemLogDto>> GetLogsAsync(Guid? deviceId = null, LogLevel? level = null, LogSource? source = null, int limit = 100, CancellationToken cancellationToken = default);
    }
}
