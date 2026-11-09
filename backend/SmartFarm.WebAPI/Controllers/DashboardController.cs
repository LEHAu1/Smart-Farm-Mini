using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Dashboard;
using System.Security.Claims;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// REST API Controller cung cấp số liệu tổng quan hệ thống Dashboard
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        }

        /// <summary>
        /// Lấy toàn bộ số liệu tổng hợp cho trang Dashboard (Thiết bị, cảm biến, máy bơm, cảnh báo gần nhất)
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(subClaim, out var currentUserId);

            var role = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

            // User thường chỉ lấy số liệu từ các thiết bị của mình; Admin xem toàn bộ
            Guid? filterOwnerId = isAdmin ? null : currentUserId;

            var summary = await _dashboardService.GetSummaryAsync(filterOwnerId, cancellationToken);
            return Ok(summary);
        }
    }
}

