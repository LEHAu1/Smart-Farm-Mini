using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartFarm.Infrastructure.Mqtt;
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
        private readonly MqttClientService? _mqttClient;
        private readonly MqttBrokerSettings _mqttSettings;

        public HealthController(
            SmartFarmDbContext dbContext,
            IOptions<MqttBrokerSettings> mqttSettings,
            MqttClientService? mqttClient = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _mqttSettings = mqttSettings?.Value ?? throw new ArgumentNullException(nameof(mqttSettings));
            _mqttClient = mqttClient;
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
            var databaseReady = false;
            var databaseName = (string?)null;
            var deviceRegisteredAndActive = false;

            try
            {
                databaseReady = await _dbContext.Database.CanConnectAsync(cancellationToken);
                if (databaseReady)
                {
                    databaseName = _dbContext.Database.GetDbConnection().Database;
                    if (!string.IsNullOrWhiteSpace(_mqttSettings.TelemetryDeviceCode))
                    {
                        deviceRegisteredAndActive = await _dbContext.Devices
                            .AsNoTracking()
                            .AnyAsync(device => device.DeviceCode == _mqttSettings.TelemetryDeviceCode && device.IsActive,
                                cancellationToken);
                    }
                }
            }
            catch (OperationCanceledException) when (IsClientRequestAborted(cancellationToken))
            {
                throw;
            }
            catch (Exception)
            {
                // Readiness is unauthenticated; keep connection details out of the response.
                databaseReady = false;
            }

            var mqttStatus = _mqttClient == null
                ? "NotConfigured"
                : !_mqttClient.IsEnabled
                    ? "Disabled"
                    : _mqttClient.IsConnected
                        ? "Connected"
                        : "Disconnected";
            var mqttEnabled = _mqttClient?.IsEnabled == true;
            var mqttSubscriptionGranted = _mqttClient?.IsTelemetrySubscriptionGranted == true;
            var mqttReady = !mqttEnabled || (_mqttClient?.IsConnected == true && mqttSubscriptionGranted);
            var isHealthy = databaseReady && mqttReady;
            var telemetryReady = databaseReady && mqttEnabled && _mqttClient?.IsConnected == true &&
                mqttSubscriptionGranted && deviceRegisteredAndActive && !_mqttSettings.CommandDispatchEnabled &&
                string.IsNullOrWhiteSpace(_mqttSettings.AcknowledgementTopicFilter);
            var checks = new Dictionary<string, string>
            {
                ["database"] = databaseReady ? "Ready" : "Unhealthy",
                ["mqttBroker"] = mqttStatus,
                ["telemetrySubscription"] = !mqttEnabled
                    ? "Disabled"
                    : _mqttClient?.TelemetrySubscriptionResult ?? "Pending"
            };

            var response = new
            {
                status = isHealthy ? "Ready" : "Degraded",
                timestampUtc = DateTimeOffset.UtcNow,
                mode = mqttEnabled ? "Operational" : "Bootstrap",
                database = databaseReady ? "Ready" : "NotReady",
                databaseName,
                mqttBroker = mqttStatus,
                mqttHost = _mqttSettings.Host,
                mqttPort = _mqttSettings.Port,
                mqttUseTls = _mqttSettings.UseTls,
                mqttUsernameIsBackend = string.Equals(_mqttSettings.Username, "smartfarm_backend", StringComparison.Ordinal),
                commandDispatchEnabled = _mqttSettings.CommandDispatchEnabled,
                telemetryTopicFilter = _mqttSettings.TelemetryTopicFilter,
                telemetrySubscription = checks["telemetrySubscription"],
                acknowledgementSubscriptionEnabled = !string.IsNullOrWhiteSpace(_mqttSettings.AcknowledgementTopicFilter),
                deviceRegisteredAndActive,
                telemetryReady,
                checks
            };

            return isHealthy
                ? Ok(response)
                : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
        }

        private bool IsClientRequestAborted(CancellationToken cancellationToken)
        {
            return cancellationToken.IsCancellationRequested
                && ControllerContext?.HttpContext?.RequestAborted.IsCancellationRequested == true;
        }
    }
}
