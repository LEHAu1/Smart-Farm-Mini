using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Sensor;
using SmartFarm.Domain.Enums;
using SmartFarm.WebAPI.Extensions;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// REST API Controller truy vấn dữ liệu cảm biến hiện tại, lịch sử và tổng hợp theo giờ
    /// </summary>
    [ApiController]
    [Route("api/devices/{deviceId:guid}/sensors")]
    [Produces("application/json")]
    [Authorize]
    public class SensorsController : ControllerBase
    {
        private readonly ISensorService _sensorService;
        private readonly IDeviceService _deviceService;

        public SensorsController(ISensorService sensorService, IDeviceService deviceService)
        {
            _sensorService = sensorService ?? throw new ArgumentNullException(nameof(sensorService));
            _deviceService = deviceService ?? throw new ArgumentNullException(nameof(deviceService));
        }

        /// <summary>
        /// Lấy toàn bộ các chỉ số cảm biến mới nhất của 1 thiết bị
        /// </summary>
        [HttpGet("latest")]
        [ProducesResponseType(typeof(SensorTelemetryDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetLatest(Guid deviceId, CancellationToken cancellationToken)
        {
            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var telemetry = await _sensorService.GetCurrentTelemetryAsync(deviceId, cancellationToken);
            return Ok(telemetry);
        }

        /// <summary>
        /// Truy vấn lịch sử dữ liệu cảm biến theo loại cảm biến và khoảng thời gian UTC
        /// </summary>
        [HttpGet("history")]
        [ProducesResponseType(typeof(SensorHistoryDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetHistory(
            Guid deviceId,
            [FromQuery] SensorType sensorType = SensorType.SoilMoisture,
            [FromQuery] DateTimeOffset? fromUtc = null,
            [FromQuery] DateTimeOffset? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            if (!Enum.IsDefined(typeof(SensorType), sensorType))
                return BadRequest(new { message = $"Giá trị sensorType '{sensorType}' không hợp lệ." });

            var to = (toUtc ?? DateTimeOffset.UtcNow).ToUniversalTime();
            var from = (fromUtc ?? to.AddHours(-24)).ToUniversalTime();
            if (from > to)
                return BadRequest(new { message = "fromUtc phải nhỏ hơn hoặc bằng toUtc." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var history = await _sensorService.GetSensorHistoryAsync(deviceId, sensorType, from, to, cancellationToken);
            return Ok(history);
        }

        /// <summary>
        /// Truy vấn dữ liệu thống kê cảm biến theo giờ (Min, Max, Avg, SampleCount)
        /// </summary>
        [HttpGet("aggregates")]
        [ProducesResponseType(typeof(IReadOnlyList<SensorAggregateDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAggregates(
            Guid deviceId,
            [FromQuery] SensorType? sensorType = null,
            [FromQuery] DateTimeOffset? fromUtc = null,
            [FromQuery] DateTimeOffset? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            if (sensorType.HasValue && !Enum.IsDefined(typeof(SensorType), sensorType.Value))
                return BadRequest(new { message = $"Giá trị sensorType '{sensorType}' không hợp lệ." });

            var to = (toUtc ?? DateTimeOffset.UtcNow).ToUniversalTime();
            var from = (fromUtc ?? to.AddDays(-7)).ToUniversalTime();
            if (from > to)
                return BadRequest(new { message = "fromUtc phải nhỏ hơn hoặc bằng toUtc." });

            var accessError = await this.EnsureDeviceAccessAsync(_deviceService, deviceId, cancellationToken);
            if (accessError is not null)
                return accessError;

            var aggregates = await _sensorService.GetAggregatesAsync(deviceId, sensorType, from, to, cancellationToken);
            return Ok(aggregates);
        }
    }
}
