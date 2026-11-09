using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.SystemLog;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
// Chỉ định rõ LogLevel ưu tiên SmartFarm.Domain.Enums.LogLevel để tránh conflict với Microsoft.Extensions.Logging.LogLevel
using LogLevel = SmartFarm.Domain.Enums.LogLevel;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Hiện thực hóa SystemLog Service xử lý nghiệp vụ lưu và truy vấn nhật ký hệ thống
    /// </summary>
    public class SystemLogService : ISystemLogService
    {
        private readonly ISystemLogRepository _logRepository;
        private readonly ILogger<SystemLogService> _logger;

        public SystemLogService(
            ISystemLogRepository logRepository,
            ILogger<SystemLogService> logger)
        {
            _logRepository = logRepository ?? throw new ArgumentNullException(nameof(logRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<SystemLogDto> LogAsync(
            CreateSystemLogRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var log = new SystemLog(
                request.Level,
                request.Source,
                request.EventCode,
                request.Message,
                DateTimeOffset.UtcNow,
                request.DeviceId,
                request.ExceptionDetails);

            await _logRepository.AddAsync(log, cancellationToken);
            await _logRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã lưu System Log [{Level}] {EventCode}: {Message}",
                log.Level, log.EventCode, log.Message);

            return MapToDto(log);
        }

        public async Task<SystemLogDto?> GetByIdAsync(Guid logId, CancellationToken cancellationToken = default)
        {
            var log = await _logRepository.GetByIdAsync(logId, cancellationToken);
            return log != null ? MapToDto(log) : null;
        }

        public async Task<IReadOnlyList<SystemLogDto>> GetLogsAsync(
            Guid? deviceId = null,
            LogLevel? level = null,
            LogSource? source = null,
            int limit = 100,
            CancellationToken cancellationToken = default)
        {
            var logs = await _logRepository.GetLogsAsync(deviceId, level, source, limit, cancellationToken);
            return logs.Select(MapToDto).ToList();
        }

        private static SystemLogDto MapToDto(SystemLog entity)
        {
            return new SystemLogDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                Level = entity.Level,
                Source = entity.Source,
                EventCode = entity.EventCode,
                Message = entity.Message,
                ExceptionDetails = entity.ExceptionDetails,
                CreatedAtUtc = entity.CreatedAtUtc
            };
        }
    }
}
