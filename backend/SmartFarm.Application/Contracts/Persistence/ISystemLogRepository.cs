using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ nhật ký hệ thống (SystemLog Repository)
    /// </summary>
    public interface ISystemLogRepository
    {
        Task<SystemLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SystemLog>> GetLogsAsync(Guid? deviceId = null, LogLevel? level = null, LogSource? source = null, int limit = 100, CancellationToken cancellationToken = default);
        Task AddAsync(SystemLog log, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
