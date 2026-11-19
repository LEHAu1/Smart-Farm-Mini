using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Dashboard;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.Infrastructure.Persistence.Data;
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
        private readonly SmartFarmDbContext _dbContext;
        private readonly MqttClientService _mqttClient;

        public DashboardController(
            IDashboardService dashboardService,
            SmartFarmDbContext dbContext,
            MqttClientService mqttClient)
        {
            _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _mqttClient = mqttClient ?? throw new ArgumentNullException(nameof(mqttClient));
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

        /// <summary>
        /// Lấy thông tin trạng thái sức khỏe các thành phần hệ thống (Backend, DB, MQTT Broker)
        /// </summary>
        [HttpGet("system-health")]
        [ProducesResponseType(typeof(SystemHealthDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
        {
            var canConnectDb = false;
            try
            {
                canConnectDb = await _dbContext.Database.CanConnectAsync(cancellationToken);
            }
            catch
            {
                canConnectDb = false;
            }

            var mqttStatus = !_mqttClient.IsEnabled
                ? "Disabled"
                : _mqttClient.IsConnected
                    ? "Connected"
                    : "Disconnected";

            var health = new SystemHealthDto
            {
                BackendStatus = "Healthy",
                DatabaseStatus = canConnectDb ? "Ready" : "Unhealthy",
                MqttBrokerStatus = mqttStatus,
                IsMqttEnabled = _mqttClient.IsEnabled,
                TimestampUtc = DateTimeOffset.UtcNow
            };

            return Ok(health);
        }
    }
}

