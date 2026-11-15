using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;
using SmartFarm.Application.DTOs.Alert;

namespace SmartFarm.WebAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/alerts")]
    public class AlertsController(IAlertService alerts, IDeviceService devices) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<PageResult<AlertDto>>> GetAll(
            [FromQuery] AlertSeverity? severity,
            [FromQuery] bool? isResolved,
            [FromQuery] Guid? deviceId,
            [FromQuery, Range(1, int.MaxValue)] int pageIndex = 1,
            [FromQuery, Range(1, 100)] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            Guid? ownerId = User.IsInRole("Admin") ? null : userId;
            var pagination = new PaginationParams { PageIndex = pageIndex, PageSize = pageSize };
            return Ok(await alerts.GetPagedAsync(ownerId, deviceId, severity, isResolved, pagination, cancellationToken));
        }

        [HttpGet("summary")]
        public async Task<ActionResult<AlertSummaryDto>> GetSummary(CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            Guid? ownerId = User.IsInRole("Admin") ? null : userId;
            return Ok(await alerts.GetSummaryAsync(ownerId, cancellationToken));
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(AlertDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AlertDto>> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            var alert = await alerts.GetByIdAsync(id, cancellationToken);
            if (alert is null)
                return NotFound(new { message = $"Không tìm thấy cảnh báo với ID '{id}'." });

            if (!User.IsInRole("Admin"))
            {
                var device = await devices.GetByIdAsync(alert.DeviceId, cancellationToken);
                if (device is null || device.OwnerId != userId)
                    return NotFound(new { message = $"Không tìm thấy cảnh báo với ID '{id}'." });
            }

            return Ok(alert);
        }

        [HttpPatch("{id:guid}/resolve")]
        public async Task<ActionResult<AlertDto>> Resolve(Guid id, CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            var alert = await alerts.GetByIdAsync(id, cancellationToken);
            if (alert is null)
                return NotFound();

            if (!User.IsInRole("Admin"))
            {
                var device = await devices.GetByIdAsync(alert.DeviceId, cancellationToken);
                if (device?.OwnerId != userId)
                    return NotFound();
            }

            if (alert.IsResolved)
                return Ok(alert);

            return Ok(await alerts.ResolveAlertAsync(id, cancellationToken));
        }
    }
}
