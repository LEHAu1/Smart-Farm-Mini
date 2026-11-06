using Microsoft.AspNetCore.Mvc;

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
        /// <summary>
        /// Kiểm tra tình trạng sức khỏe của Web API
        /// </summary>
        /// <response code="200">Hệ thống Web API hoạt động bình thường</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult CheckHealth()
        {
            return Ok(new
            {
                status = "Healthy"
            });
        }
    }
}
