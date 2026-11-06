using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Device;
using System.Security.Claims;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// REST API Controller quản lý thiết bị IoT trong hệ thống Smart Farm Mini
    /// Yêu cầu JWT Authentication và phân quyền Admin/User.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize] // Toàn bộ controller yêu cầu phải đăng nhập
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService ?? throw new ArgumentNullException(nameof(deviceService));
        }

        /// <summary>
        /// Lấy danh sách tất cả các thiết bị IoT (Dành cho User và Admin)
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IReadOnlyList<DeviceDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var devices = await _deviceService.GetAllAsync(cancellationToken);
            return Ok(devices);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một thiết bị theo ID (Dành cho User và Admin)
        /// </summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            var device = await _deviceService.GetByIdAsync(id, cancellationToken);
            if (device is null)
                return NotFound(new { message = $"Không tìm thấy thiết bị với ID '{id}'." });

            return Ok(device);
        }

        /// <summary>
        /// Đăng ký mới một thiết bị IoT vào hệ thống (CHỈ DÀNH CHO ADMIN)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Create([FromBody] CreateDeviceRequest request, CancellationToken cancellationToken)
        {
            // Nếu OwnerId chưa có trong request, tự động lấy ID của Admin đang đăng nhập
            if (request.OwnerId == Guid.Empty)
            {
                var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(subClaim, out var currentUserId))
                {
                    request.OwnerId = currentUserId;
                }
            }

            var created = await _deviceService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        /// <summary>
        /// Vô hiệu hóa một thiết bị IoT (CHỈ DÀNH CHO ADMIN)
        /// </summary>
        [HttpPut("{id:guid}/deactivate")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
        {
            await _deviceService.DeactivateAsync(id, cancellationToken);
            return NoContent();
        }
    }
}
