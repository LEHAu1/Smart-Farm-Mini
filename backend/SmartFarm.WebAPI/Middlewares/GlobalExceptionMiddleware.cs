using System.Net;
using System.Security;
using System.Text.Json;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.WebAPI.Middlewares
{
    /// <summary>
    /// Middleware xử lý ngoại lệ tập trung toàn ứng dụng
    /// </summary>
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment _environment;

        public GlobalExceptionMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionMiddleware> logger,
            IWebHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var method = SanitizeForLog(context.Request.Method);
                var path = SanitizeForLog(context.Request.Path.Value);
                _logger.LogError(ex, "Lỗi chưa được xử lý khi thực hiện request: {Method} {Path}", method, path);
                await HandleExceptionAsync(context, ex);
            }
        }

        private static string SanitizeForLog(string? input)
        {
            if (string.IsNullOrEmpty(input))
            {
                return string.Empty;
            }

            return input.Replace("\r", string.Empty).Replace("\n", string.Empty);
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var statusCode = exception switch
            {
                DomainException => HttpStatusCode.BadRequest,
                ArgumentException => HttpStatusCode.BadRequest,
                InvalidOperationException => HttpStatusCode.BadRequest,
                KeyNotFoundException => HttpStatusCode.NotFound,
                UnauthorizedAccessException => HttpStatusCode.Unauthorized,
                SecurityException => HttpStatusCode.Unauthorized,
                _ => HttpStatusCode.InternalServerError
            };

            context.Response.StatusCode = (int)statusCode;

            var response = new
            {
                status = (int)statusCode,
                error = statusCode == HttpStatusCode.InternalServerError ? "Đã có lỗi hệ thống xảy ra." : exception.Message,
                details = _environment.IsDevelopment() && statusCode == HttpStatusCode.InternalServerError ? exception.ToString() : null,
                timestampUtc = DateTimeOffset.UtcNow
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
        }
    }
}
