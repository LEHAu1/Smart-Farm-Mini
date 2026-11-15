using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Hiện thực hóa Irrigation Service xử lý nghiệp vụ tưới và quy tắc tưới
    /// </summary>
    public class IrrigationService : IIrrigationService
    {
        private readonly IIrrigationRuleRepository _ruleRepository;
        private readonly IIrrigationLogRepository _logRepository;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ILogger<IrrigationService> _logger;

        public IrrigationService(
            IIrrigationRuleRepository ruleRepository,
            IIrrigationLogRepository logRepository,
            IDeviceRepository deviceRepository,
            ILogger<IrrigationService> logger)
        {
            _ruleRepository = ruleRepository ?? throw new ArgumentNullException(nameof(ruleRepository));
            _logRepository = logRepository ?? throw new ArgumentNullException(nameof(logRepository));
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // ── 1. Quản lý Quy tắc tưới ─────────────────────────────────

        public async Task<IrrigationRuleDto> CreateRuleAsync(
            CreateIrrigationRuleRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                _logger.LogWarning("Không thể tạo quy tắc tưới: Thiết bị {DeviceId} không tồn tại.", request.DeviceId);
                throw new DeviceNotFoundException(request.DeviceId);
            }

            // Đảm bảo chỉ có tối đa 1 quy tắc đang bật (khớp filtered unique index IX_IrrigRules_OneActivePerDevice)
            var existingActive = await _ruleRepository.GetActiveRuleByDeviceIdAsync(request.DeviceId, cancellationToken);
            if (existingActive != null)
            {
                throw new InvalidOperationException("Thiết bị đã có một quy tắc tưới đang hoạt động. Vui lòng tắt quy tắc hiện tại trước khi tạo mới.");
            }

            var nowUtc = DateTimeOffset.UtcNow;
            var rule = new IrrigationRule(
                request.DeviceId,
                request.Name,
                request.MoistureThreshold,
                request.TargetMoisture,
                request.MinIntervalMinutes,
                request.MaxDurationSeconds,
                nowUtc);

            await _ruleRepository.AddAsync(rule, cancellationToken);
            await _ruleRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã tạo quy tắc tưới mới '{Name}' (ID {RuleId}) cho thiết bị {DeviceId}",
                rule.Name, rule.Id, rule.DeviceId);

            return MapRuleToDto(rule);
        }

        public async Task<IrrigationRuleDto> UpdateRuleAsync(
            Guid ruleId,
            UpdateIrrigationRuleRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var rule = await _ruleRepository.GetByIdAsync(ruleId, cancellationToken);
            if (rule == null)
            {
                _logger.LogWarning("Không tìm thấy quy tắc tưới ID {RuleId} để cập nhật.", ruleId);
                throw new KeyNotFoundException($"Irrigation rule with ID '{ruleId}' was not found.");
            }

            rule.UpdateSettings(
                request.Name,
                request.MoistureThreshold,
                request.TargetMoisture,
                request.MinIntervalMinutes,
                request.MaxDurationSeconds,
                DateTimeOffset.UtcNow);

            await _ruleRepository.UpdateAsync(rule, cancellationToken);
            await _ruleRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã cập nhật quy tắc tưới ID {RuleId}", ruleId);
            return MapRuleToDto(rule);
        }

        public async Task<IrrigationRuleDto?> GetRuleByIdAsync(Guid ruleId, CancellationToken cancellationToken = default)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId, cancellationToken);
            return rule != null ? MapRuleToDto(rule) : null;
        }

        public async Task<IReadOnlyList<IrrigationRuleDto>> GetRulesByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            var rules = await _ruleRepository.GetByDeviceIdAsync(deviceId, cancellationToken);
            return rules.Select(MapRuleToDto).ToList();
        }

        public async Task<IrrigationRuleDto> ToggleRuleAsync(Guid ruleId, bool isEnabled, CancellationToken cancellationToken = default)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId, cancellationToken);
            if (rule == null)
            {
                throw new KeyNotFoundException($"Irrigation rule with ID '{ruleId}' was not found.");
            }

            var nowUtc = DateTimeOffset.UtcNow;
            if (isEnabled)
            {
                var existingActive = await _ruleRepository.GetActiveRuleByDeviceIdAsync(rule.DeviceId, cancellationToken);
                if (existingActive != null && existingActive.Id != rule.Id)
                {
                    throw new InvalidOperationException("Thiết bị đã có quy tắc tưới khác đang bật. Vui lòng tắt quy tắc đó trước.");
                }

                rule.Enable(nowUtc);
            }
            else
            {
                rule.Disable(nowUtc);
            }

            await _ruleRepository.UpdateAsync(rule, cancellationToken);
            await _ruleRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã thay đổi trạng thái quy tắc tưới {RuleId}: IsEnabled = {IsEnabled}", ruleId, isEnabled);
            return MapRuleToDto(rule);
        }

        public async Task DeleteRuleAsync(Guid ruleId, CancellationToken cancellationToken = default)
        {
            var rule = await _ruleRepository.GetByIdAsync(ruleId, cancellationToken);
            if (rule == null)
            {
                throw new KeyNotFoundException($"Irrigation rule with ID '{ruleId}' was not found.");
            }

            await _ruleRepository.DeleteAsync(rule, cancellationToken);
            await _ruleRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã xóa quy tắc tưới ID {RuleId}", ruleId);
        }

        // ── 2. Quản lý Nhật ký và Trạng thái tưới ──────────────────

        public async Task<IrrigationLogDto> StartIrrigationAsync(
            CreateIrrigationLogRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                throw new DeviceNotFoundException(request.DeviceId);
            }

            var activeLog = await _logRepository.GetCurrentInProgressByDeviceIdAsync(request.DeviceId, cancellationToken);
            if (activeLog != null)
            {
                _logger.LogWarning("Thiết bị {DeviceId} đang có phiên tưới dở dang ID {LogId}.", request.DeviceId, activeLog.Id);
                return MapLogToDto(activeLog);
            }

            var log = new IrrigationLog(
                request.DeviceId,
                request.Mode,
                DateTimeOffset.UtcNow,
                request.SoilMoistureBefore);

            await _logRepository.AddAsync(log, cancellationToken);
            await _logRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã bắt đầu phiên tưới mới (ID {LogId}, Mode {Mode}) cho thiết bị {DeviceId}",
                log.Id, log.Mode, log.DeviceId);

            return MapLogToDto(log);
        }

        public async Task<IrrigationLogDto> CompleteIrrigationAsync(
            Guid logId,
            CompleteIrrigationLogRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var log = await _logRepository.GetByIdAsync(logId, cancellationToken);
            if (log == null)
            {
                throw new KeyNotFoundException($"Irrigation log with ID '{logId}' was not found.");
            }

            log.Complete(
                DateTimeOffset.UtcNow,
                request.SoilMoistureAfter,
                request.WaterAmountMl);

            await _logRepository.UpdateAsync(log, cancellationToken);
            await _logRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã hoàn thành phiên tưới ID {LogId}. Thời gian: {Duration}s, Nước tiêu thụ: {Water}ml",
                log.Id, log.DurationSeconds, log.WaterAmountMl);

            return MapLogToDto(log);
        }

        public async Task<IrrigationLogDto?> GetLogByIdAsync(
            Guid logId,
            CancellationToken cancellationToken = default)
        {
            var log = await _logRepository.GetByIdAsync(logId, cancellationToken);
            return log != null ? MapLogToDto(log) : null;
        }

        public async Task<IReadOnlyList<IrrigationLogDto>> GetLogsByDeviceIdAsync(
            Guid deviceId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            var logs = await _logRepository.GetByDeviceIdAsync(deviceId, limit, cancellationToken);
            return logs.Select(MapLogToDto).ToList();
        }

        public async Task<PageResult<IrrigationLogDto>> GetLogsPagedAsync(
            Guid? ownerId,
            Guid? deviceId,
            IrrigationMode? mode,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var (items, totalCount) = await _logRepository.GetPagedAsync(
                ownerId, deviceId, mode, pageNumber, pageSize, cancellationToken);

            var dtos = items.Select(MapLogToDto).ToList();
            return new PageResult<IrrigationLogDto>(dtos, totalCount, pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : Math.Min(pageSize, 100));
        }

        public async Task<IrrigationStatusDto> GetCurrentStatusAsync(
            Guid deviceId,
            CancellationToken cancellationToken = default)
        {
            var inProgressLog = await _logRepository.GetCurrentInProgressByDeviceIdAsync(deviceId, cancellationToken);
            var latestLog = inProgressLog ?? await _logRepository.GetLatestByDeviceIdAsync(deviceId, cancellationToken);

            return new IrrigationStatusDto
            {
                DeviceId = deviceId,
                IsPumpRunning = inProgressLog != null,
                CurrentMode = latestLog?.Mode ?? IrrigationMode.Automatic,
                LastIrrigationStartedAtUtc = latestLog?.StartedAtUtc,
                LastIrrigationDurationSeconds = latestLog?.DurationSeconds,
                LastSoilMoisture = latestLog?.SoilMoistureAfter ?? latestLog?.SoilMoistureBefore
            };
        }

        private static IrrigationRuleDto MapRuleToDto(IrrigationRule entity)
        {
            return new IrrigationRuleDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                Name = entity.Name,
                MoistureThreshold = entity.MoistureThreshold,
                TargetMoisture = entity.TargetMoisture,
                MinIntervalMinutes = entity.MinIntervalMinutes,
                MaxDurationSeconds = entity.MaxDurationSeconds,
                IsEnabled = entity.IsEnabled,
                CreatedAtUtc = entity.CreatedAtUtc,
                UpdatedAtUtc = entity.UpdatedAtUtc,
                LastTriggeredAtUtc = entity.LastTriggeredAtUtc
            };
        }

        private static IrrigationLogDto MapLogToDto(IrrigationLog entity)
        {
            return new IrrigationLogDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                Mode = entity.Mode,
                Status = entity.Status,
                SoilMoistureBefore = entity.SoilMoistureBefore,
                SoilMoistureAfter = entity.SoilMoistureAfter,
                WaterAmountMl = entity.WaterAmountMl,
                StartedAtUtc = entity.StartedAtUtc,
                CompletedAtUtc = entity.CompletedAtUtc,
                DurationSeconds = entity.DurationSeconds,
                Note = entity.Note
            };
        }
    }
}
