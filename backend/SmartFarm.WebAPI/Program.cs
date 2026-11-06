using SmartFarm.Application;
using SmartFarm.Infrastructure;
using SmartFarm.WebAPI.Extensions;

namespace SmartFarm.WebAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // 1. Đăng ký Application & Infrastructure Services (Clean Architecture DI)
            builder.Services.AddApplicationServices();
            builder.Services.AddInfrastructureServices(builder.Configuration);

            // 2. Đăng ký JWT Authentication
            builder.Services.AddJwtAuthentication(builder.Configuration);

            // 3. Đăng ký Controllers
            builder.Services.AddControllers();

            // 4. Đăng ký Swagger UI / OpenAPI Documentation (hỗ trợ JWT Bearer)
            builder.Services.AddSwaggerDocumentation();

            // 5. Đăng ký CORS cho Frontend React (Development)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("DevelopmentCors", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            var app = builder.Build();

            // 6. Cấu hình HTTP Request Pipeline
            app.UseGlobalExceptionHandler();

            app.UseSwaggerDocumentation(app.Environment);

            app.UseHttpsRedirection();

            app.UseCors("DevelopmentCors");

            // Authentication PHẢI nằm TRƯỚC Authorization
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
