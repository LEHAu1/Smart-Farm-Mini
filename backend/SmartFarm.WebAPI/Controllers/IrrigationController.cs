using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Application.Validators;
using SmartFarm.Domain.Enums;
using SmartFarm.WebAPI.Extensions;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// REST API Controller quản lý quy tắc tưới tự động, trạng thái máy bơm và lịch sử tưới
    /// </summary>
    [ApiController]
    [Route("api")]
    [Produces("application/json")]
    [Authorize]
    public class IrrigationController : ControllerBase
    {
        private readonly IIrrigationService _irrigationService;
        private readonly IDeviceService _deviceService;

        public IrrigationController(IIrrigationService irrigationService, IDeviceService deviceService)
        {
            _irrigationService = irrigationService ?? throw new ArgumentNullException(nameof(irrigationService));
            _deviceService = deviceService ?? throw new ArgumentNullException(nameof(deviceService));
        }

        // ── Quản lý quy tắc tưới (Irrigation Rules) ──────────────────

        /// <summary>
        /// Lấy danh sách quy tắc tưới của một thiết bị
        /// </summary>
        [HttpGet("devices/{deviceId:guid}/irrigation-rules")]
        [ProducesResponseType(typeof(IReadOnlyList<IrrigationRuleDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRulesByDevice(Guid deviceId, CancellationToken cancellationToken)
        {
            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var rules = await _irrigationService.GetRulesByDeviceIdAsync(deviceId, cancellationToken);
            return Ok(rules);
        }

        /// <summary>
        /// Tạo quy tắc tưới tự động mới cho thiết bị
        /// </summary>
        [HttpPost("devices/{deviceId:guid}/irrigation-rules")]
        [ProducesResponseType(typeof(IrrigationRuleDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateRule(
            Guid deviceId,
            [FromBody] CreateIrrigationRuleRequest request,
            CancellationToken cancellationToken)
        {
            if (request is null)
                return BadRequest(new { message = "Dữ liệu quy tắc tưới không được để trống." });

            if (request.DeviceId != Guid.Empty && request.DeviceId != deviceId)
                return BadRequest(new { message = "DeviceId trong body không khớp với deviceId trên đường dẫn." });

            request.DeviceId = deviceId;

            var (isValid, errorMessage) = IrrigationRuleValidator.ValidateCreate(request);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var created = await _irrigationService.CreateRuleAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetRulesByDevice), new { deviceId }, created);
        }

        /// <summary>
        /// Cập nhật cấu hình quy tắc tưới
        /// </summary>
        [HttpPut("irrigation-rules/{ruleId:guid}")]
        [ProducesResponseType(typeof(IrrigationRuleDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRule(
            Guid ruleId,
            [FromBody] UpdateIrrigationRuleRequest request,
            CancellationToken cancellationToken)
        {
            var (isValid, errorMessage) = IrrigationRuleValidator.ValidateUpdate(request);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            var existingRule = await _irrigationService.GetRuleByIdAsync(ruleId, cancellationToken);
            if (existingRule is null)
                return NotFound(new { message = $"Không tìm thấy quy tắc tưới với ID '{ruleId}'." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, existingRule.DeviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var updated = await _irrigationService.UpdateRuleAsync(ruleId, request, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// Bật hoặc tắt quy tắc tưới tự động (mỗi thiết bị chỉ có tối đa 1 quy tắc đang bật)
        /// </summary>
        [HttpPatch("irrigation-rules/{ruleId:guid}/toggle")]
        [ProducesResponseType(typeof(IrrigationRuleDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleRule(
            Guid ruleId,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ToggleIrrigationRuleRequest? request = null,
            [FromQuery] bool? isEnabled = null,
            CancellationToken cancellationToken = default)
        {
            var existingRule = await _irrigationService.GetRuleByIdAsync(ruleId, cancellationToken);
            if (existingRule is null)
                return NotFound(new { message = $"Không tìm thấy quy tắc tưới với ID '{ruleId}'." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, existingRule.DeviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var targetState = request?.IsEnabled ?? isEnabled ?? !existingRule.IsEnabled;
            var updated = await _irrigationService.ToggleRuleAsync(ruleId, targetState, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// Xóa quy tắc tưới
        /// </summary>
        [HttpDelete("irrigation-rules/{ruleId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteRule(Guid ruleId, CancellationToken cancellationToken)
        {
            var existingRule = await _irrigationService.GetRuleByIdAsync(ruleId, cancellationToken);
            if (existingRule is null)
                return NotFound(new { message = $"Không tìm thấy quy tắc tưới với ID '{ruleId}'." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, existingRule.DeviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            await _irrigationService.DeleteRuleAsync(ruleId, cancellationToken);
            return NoContent();
        }

        // ── Lịch sử & Trạng thái tưới (Irrigation Status & Logs) ─────

        /// <summary>
        /// Kiểm tra trạng thái máy bơm đang chạy hay dừng của thiết bị
        /// </summary>
        [HttpGet("devices/{deviceId:guid}/irrigation/status")]
        [ProducesResponseType(typeof(IrrigationStatusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStatus(Guid deviceId, CancellationToken cancellationToken)
        {
            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var status = await _irrigationService.GetCurrentStatusAsync(deviceId, cancellationToken);
            return Ok(status);
        }

        /// <summary>
        /// Lấy danh sách lịch sử các phiên tưới (lọc theo thiết bị, chế độ Manual/Automatic, phân trang)
        /// </summary>
        [HttpGet("irrigation-logs")]
        [ProducesResponseType(typeof(PageResult<IrrigationLogDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetLogs(
            [FromQuery] Guid? deviceId = null,
            [FromQuery] IrrigationMode? mode = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            if (mode.HasValue && !Enum.IsDefined(typeof(IrrigationMode), mode.Value))
                return BadRequest(new { message = $"Giá trị mode '{mode}' không hợp lệ." });

            if (deviceId.HasValue && deviceId.Value != Guid.Empty)
            {
                var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId.Value, cancellationToken);
                if (accessError is not null)
                    return accessError;
            }

            var (userId, isAdmin) = User.GetCurrentUserContext();
            Guid? filterOwnerId = isAdmin ? null : userId;

            var result = await _irrigationService.GetLogsPagedAsync(
                filterOwnerId, deviceId, mode, pageNumber, pageSize, cancellationToken);

            return Ok(result);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một phiên tưới nước theo ID
        /// </summary>
        [HttpGet("irrigation-logs/{logId:guid}")]
        [ProducesResponseType(typeof(IrrigationLogDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetLogById(Guid logId, CancellationToken cancellationToken)
        {
            var log = await _irrigationService.GetLogByIdAsync(logId, cancellationToken);
            if (log is null)
                return NotFound(new { message = $"Không tìm thấy nhật ký tưới với ID '{logId}'." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, log.DeviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            return Ok(log);
        }
    }
}
