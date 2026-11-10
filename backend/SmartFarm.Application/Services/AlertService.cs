using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Hiện thực hóa Alert Service xử lý nghiệp vụ cảnh báo sự cố
    /// </summary>
    public class AlertService : IAlertService
    {
        private readonly IAlertRepository _alertRepository;
        private readonly IDeviceRepository _deviceRepository;
        private readonly ILogger<AlertService> _logger;

        public AlertService(
            IAlertRepository alertRepository,
            IDeviceRepository deviceRepository,
            ILogger<AlertService> logger)
        {
            _alertRepository = alertRepository ?? throw new ArgumentNullException(nameof(alertRepository));
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<AlertDto> CreateAlertAsync(
            CreateAlertRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                _logger.LogWarning("Không thể tạo cảnh báo: Thiết bị ID {DeviceId} không tồn tại.", request.DeviceId);
                throw new DeviceNotFoundException(request.DeviceId);
            }

            var alert = new Alert(
                request.DeviceId,
                request.AlertCode,
                request.Title,
                request.Message,
                request.Severity,
                DateTimeOffset.UtcNow);

            await _alertRepository.AddAsync(alert, cancellationToken);
            await _alertRepository.SaveChangesAsync(cancellationToken);

            _logger.LogWarning("Phát sinh cảnh báo mới [{Severity}] {AlertCode} trên thiết bị {DeviceId}: {Title}",
                alert.Severity, alert.AlertCode, alert.DeviceId, alert.Title);

            return MapToDto(alert);
        }

        public async Task<AlertDto?> GetByIdAsync(Guid alertId, CancellationToken cancellationToken = default)
        {
            var alert = await _alertRepository.GetByIdAsync(alertId, cancellationToken);
            return alert != null ? MapToDto(alert) : null;
        }

        public async Task<IReadOnlyList<AlertDto>> GetByDeviceIdAsync(
            Guid deviceId,
            bool? isResolved = null,
            int limit = 50,
            CancellationToken cancellationToken = default)
        {
            var alerts = await _alertRepository.GetByDeviceIdAsync(deviceId, isResolved, limit, cancellationToken);
            return alerts.Select(MapToDto).ToList();
        }

        public async Task<IReadOnlyList<AlertDto>> GetUnresolvedAlertsAsync(CancellationToken cancellationToken = default)
        {
            var alerts = await _alertRepository.GetUnresolvedAlertsAsync(cancellationToken);
            return alerts.Select(MapToDto).ToList();
        }

        public async Task<AlertDto> ResolveAlertAsync(Guid alertId, CancellationToken cancellationToken = default)
        {
            var alert = await _alertRepository.GetByIdAsync(alertId, cancellationToken);
            if (alert == null)
            {
                throw new KeyNotFoundException($"Alert with ID '{alertId}' was not found.");
            }

            alert.Resolve(DateTimeOffset.UtcNow);

            await _alertRepository.UpdateAsync(alert, cancellationToken);
            await _alertRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Cảnh báo ID {AlertId} đã được đánh dấu xử lý thành công.", alertId);
            return MapToDto(alert);
        }

        public async Task<PageResult<AlertDto>> GetPagedAsync(Guid? ownerId, Guid? deviceId, AlertSeverity? severity, bool? isResolved, PaginationParams pagination, CancellationToken cancellationToken = default)
        {
            var page = await _alertRepository.GetPagedAsync(ownerId, deviceId, severity, isResolved, pagination, cancellationToken);
            return new PageResult<AlertDto>(page.Items.Select(MapToDto).ToList(), page.TotalCount, page.PageIndex, page.PageSize);
        }

        public Task<AlertSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default)
        {
            return _alertRepository.GetSummaryAsync(ownerId, cancellationToken);
        }

        private static AlertDto MapToDto(Alert entity)
        {
            return new AlertDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                AlertCode = entity.AlertCode,
                Title = entity.Title,
                Message = entity.Message,
                Severity = entity.Severity,
                IsResolved = entity.IsResolved,
                CreatedAtUtc = entity.CreatedAtUtc,
                ResolvedAtUtc = entity.ResolvedAtUtc
            };
        }
    }
}
