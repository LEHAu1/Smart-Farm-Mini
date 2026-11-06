using SmartFarm.WebAPI.Middlewares;

namespace SmartFarm.WebAPI.Extensions
{
    /// <summary>
    /// Các phương thức mở rộng cấu hình HTTP Request Pipeline
    /// </summary>
    public static class WebApplicationExtensions
    {
        /// <summary>
        /// Kích hoạt Middleware xử lý lỗi toàn cục
        /// </summary>
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
        {
            return app.UseMiddleware<GlobalExceptionMiddleware>();
        }
    }
}
