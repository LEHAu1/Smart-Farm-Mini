using SmartFarm.Application;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Infrastructure;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.WebAPI.Extensions;
using SmartFarm.WebAPI.Hubs;
using SmartFarm.WebAPI.BackgroundServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;

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

            builder.Services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                var previousHandler = options.Events.OnMessageReceived;
                options.Events.OnMessageReceived = async context =>
                {
                    await previousHandler(context);
                    if (string.IsNullOrEmpty(context.Token) &&
                        context.Request.Path.StartsWithSegments("/hubs/sensors"))
                    {
                        context.Token = context.Request.Query["access_token"];
                    }
                };
            });

            // 3. Đăng ký Controllers
            builder.Services.AddControllers();
            builder.Services.AddSignalR();
            builder.Services.AddSingleton<MqttMessageHandler>();
            builder.Services.AddSingleton<ISensorHubNotifier, SensorHubNotifier>();
            builder.Services.AddHostedService<MqttHostedService>();
            builder.Services.AddHostedService<DeviceHeartbeatService>();

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
            app.MapHub<SensorHub>("/hubs/sensors");

            app.Run();
        }
    }
}
