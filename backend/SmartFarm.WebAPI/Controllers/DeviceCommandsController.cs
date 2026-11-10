using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;
using SmartFarm.Application.DTOs.DeviceCommand;

namespace SmartFarm.WebAPI.Controllers
{
    [ApiController]
    [Authorize]
    public class DeviceCommandsController(IDeviceCommandService commands, IDeviceService devices) : ControllerBase
    {
        [HttpPost("api/devices/{deviceId:guid}/commands")]
        public async Task<ActionResult<DeviceCommandDto>> Create(
            Guid deviceId, [FromBody] ManualDeviceCommandRequest request, CancellationToken cancellationToken)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            var device = await devices.GetByIdAsync(deviceId, cancellationToken);
            if (device is null || (!User.IsInRole("Admin") && device.OwnerId != userId))
                return NotFound();

            var command = await commands.CreateCommandAsync(new CreateDeviceCommandRequest
            {
                DeviceId = deviceId,
                Action = request.Action,
                Payload = request.Payload
            }, cancellationToken);

            return StatusCode(StatusCodes.Status201Created, command);
        }

        [HttpGet("api/devices/{deviceId:guid}/commands")]
        public async Task<ActionResult<PageResult<DeviceCommandDto>>> GetByDevice(
            Guid deviceId,
            [FromQuery] CommandStatus? status,
            [FromQuery, Range(1, int.MaxValue)] int pageIndex = 1,
            [FromQuery, Range(1, 100)] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            var device = await devices.GetByIdAsync(deviceId, cancellationToken);
            if (device is null || (!User.IsInRole("Admin") && device.OwnerId != userId))
                return NotFound();

            return await GetPageAsync(userId, deviceId, status, pageIndex, pageSize, cancellationToken);
        }

        [HttpGet("api/commands")]
        public async Task<ActionResult<PageResult<DeviceCommandDto>>> GetAll(
            [FromQuery] CommandStatus? status,
            [FromQuery, Range(1, int.MaxValue)] int pageIndex = 1,
            [FromQuery, Range(1, 100)] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Unauthorized();

            return await GetPageAsync(userId, null, status, pageIndex, pageSize, cancellationToken);
        }

        private async Task<ActionResult<PageResult<DeviceCommandDto>>> GetPageAsync(
            Guid userId, Guid? deviceId, CommandStatus? status, int pageIndex, int pageSize, CancellationToken cancellationToken)
        {
            Guid? ownerId = User.IsInRole("Admin") ? null : userId;
            var pagination = new PaginationParams { PageIndex = pageIndex, PageSize = pageSize };
            return Ok(await commands.GetPagedAsync(ownerId, deviceId, status, pagination, cancellationToken));
        }
    }
}
