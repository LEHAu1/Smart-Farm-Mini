using Microsoft.AspNetCore.Mvc;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.WebAPI.Controllers
{
    /// <summary>
    /// Endpoint kiểm tra trạng thái hoạt động của hệ thống Backend (Health Check)
    /// </summary>
    [ApiController]
    [Route("health")]
    [Produces("application/json")]
    public class HealthController : ControllerBase
    {
        private readonly SmartFarmDbContext _dbContext;

        public HealthController(SmartFarmDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        /// <summary>
        /// Kiểm tra tình trạng sức khỏe tổng quan của Web API
        /// </summary>
        /// <response code="200">Hệ thống Web API hoạt động bình thường</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult CheckHealth()
        {
            return Ok(new
            {
                status = "Healthy",
                timestampUtc = DateTimeOffset.UtcNow
            });
        }

        /// <summary>
        /// Kiểm tra liveness probe: tiến trình Backend còn sống và tiếp nhận request
        /// </summary>
        /// <response code="200">Backend tiến trình đang hoạt động</response>
        [HttpGet("live")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Live()
        {
            return Ok(new
            {
                status = "Alive",
                timestampUtc = DateTimeOffset.UtcNow
            });
        }

        /// <summary>
        /// Kiểm tra readiness probe: Backend đã sẵn sàng phục vụ (kết nối cơ sở dữ liệu SQL Server)
        /// </summary>
        /// <response code="200">Hệ thống sẵn sàng tiếp nhận yêu cầu</response>
        /// <response code="503">Hệ thống chưa sẵn sàng hoặc mất kết nối DB</response>
        [HttpGet("ready")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
        public async Task<IActionResult> Ready(CancellationToken cancellationToken)
        {
            var checks = new Dictionary<string, string>();
            var isHealthy = true;

            try
            {
                var canConnectDb = await _dbContext.Database.CanConnectAsync(cancellationToken);
                checks["database"] = canConnectDb ? "Ready" : "Unhealthy";
                if (!canConnectDb)
                {
                    isHealthy = false;
                }
            }
            catch (Exception ex)
            {
                checks["database"] = $"Error: {ex.Message}";
                isHealthy = false;
            }

            var response = new
            {
                status = isHealthy ? "Ready" : "Degraded",
                timestampUtc = DateTimeOffset.UtcNow,
                checks
            };

            return isHealthy
                ? Ok(response)
                : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
        }
    }
}
