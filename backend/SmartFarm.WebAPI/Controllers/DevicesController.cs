using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.DTOs.Device;
using System.Security.Claims;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// REST API Controller quản lý thiết bị IoT trong hệ thống Smart Farm Mini
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService ?? throw new ArgumentNullException(nameof(deviceService));
        }

        /// <summary>
        /// Lấy danh sách thiết bị có tìm kiếm, lọc và phân trang
        /// User thường chỉ thấy thiết bị của mình; Admin có thể thấy toàn bộ.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PageResult<DeviceDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword = null,
            [FromQuery] bool? isOnline = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var (userId, isAdmin) = GetCurrentUserContext();

            // Nếu không phải Admin thì chỉ xem được thiết bị của chính mình
            Guid? filterOwnerId = isAdmin ? null : userId;

            var result = await _deviceService.GetPagedAsync(
                filterOwnerId, keyword, isOnline, isActive, pageNumber, pageSize, cancellationToken);

            return Ok(result);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một thiết bị theo ID
        /// </summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();

            var device = await _deviceService.GetByIdAsync(id, cancellationToken);
            if (device is null)
                return NotFound(new { message = $"Không tìm thấy thiết bị với ID '{id}'." });

            if (!isAdmin && device.OwnerId != userId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền truy cập thiết bị này." });

            return Ok(device);
        }

        /// <summary>
        /// Lấy trạng thái kết nối của thiết bị IoT (Online/Offline, LastSeenAtUtc)
        /// </summary>
        [HttpGet("{id:guid}/connection")]
        [ProducesResponseType(typeof(DeviceConnectionStatusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetConnectionStatus(Guid id, CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();

            var device = await _deviceService.GetByIdAsync(id, cancellationToken);
            if (device is null)
                return NotFound(new { message = $"Không tìm thấy thiết bị với ID '{id}'." });

            if (!isAdmin && device.OwnerId != userId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền truy cập thiết bị này." });

            var status = new DeviceConnectionStatusDto
            {
                DeviceId = device.Id,
                DeviceCode = device.DeviceCode,
                Name = device.Name,
                IsOnline = device.IsOnline,
                LastSeenAtUtc = device.LastSeenAtUtc
            };

            return Ok(status);
        }

        /// <summary>
        /// Đăng ký mới một thiết bị IoT vào hệ thống
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Create([FromBody] CreateDeviceRequest request, CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();
            if (userId == Guid.Empty)
                return Unauthorized();

            // Regular users may only register devices for their own account.
            if (!isAdmin)
            {
                request.OwnerId = userId;
            }

            var created = await _deviceService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        /// <summary>
        /// Cập nhật thông tin thiết bị (Tên, mô tả)
        /// </summary>
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(
            Guid id,
            [FromBody] UpdateDeviceRequest request,
            CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();

            var updated = await _deviceService.UpdateAsync(id, userId, isAdmin, request, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// Vô hiệu hóa thiết bị IoT
        /// </summary>
        [HttpPut("{id:guid}/deactivate")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();
            if (userId == Guid.Empty)
                return Unauthorized();

            var device = await _deviceService.GetByIdAsync(id, cancellationToken);
            if (device is null || (!isAdmin && device.OwnerId != userId))
                return NotFound();

            await _deviceService.DeactivateAsync(id, cancellationToken);
            return NoContent();
        }

        /// <summary>
        /// Kích hoạt lại thiết bị IoT
        /// </summary>
        [HttpPut("{id:guid}/activate")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Activate(Guid id, CancellationToken cancellationToken)
        {
            var (userId, isAdmin) = GetCurrentUserContext();
            if (userId == Guid.Empty)
                return Unauthorized();

            var device = await _deviceService.GetByIdAsync(id, cancellationToken);
            if (device is null || (!isAdmin && device.OwnerId != userId))
                return NotFound();

            await _deviceService.ActivateAsync(id, cancellationToken);
            return NoContent();
        }

        private (Guid UserId, bool IsAdmin) GetCurrentUserContext()
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(subClaim, out var userId);

            var role = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

            return (userId, isAdmin);
        }
    }
}
