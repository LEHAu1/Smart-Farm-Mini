using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Persistence.Repositories;
using SmartFarm.Infrastructure.Services;
using SmartFarm.Infrastructure.Mqtt;
using SmartFarm.Infrastructure.Realtime;

namespace SmartFarm.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // ── 1. Database ───────────────────────────────────────────────────
            var connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException(
                    "Không tìm thấy chuỗi kết nối 'DefaultConnection' trong cấu hình.");

            services.AddDbContext<SmartFarmDbContext>(options =>
                options.UseSqlServer(connectionString));

            services.Configure<MqttBrokerSettings>(options =>
            {
                var section = configuration.GetSection(MqttBrokerSettings.SectionName);
                if (bool.TryParse(section["Enabled"], out var enabled)) options.Enabled = enabled;
                options.Host = section["Host"] ?? options.Host;
                if (int.TryParse(section["Port"], out var port)) options.Port = port;
                options.Username = section["Username"] ?? options.Username;
                options.Password = section["Password"] ?? options.Password;
                options.ClientId = section["ClientId"] ?? options.ClientId;
                if (bool.TryParse(section["UseTls"], out var useTls)) options.UseTls = useTls;
                if (int.TryParse(section["ReconnectDelaySeconds"], out var reconnectDelaySeconds)) options.ReconnectDelaySeconds = reconnectDelaySeconds;
                if (int.TryParse(section["DeviceOfflineAfterSeconds"], out var deviceOfflineAfterSeconds)) options.DeviceOfflineAfterSeconds = deviceOfflineAfterSeconds;
                if (int.TryParse(section["HeartbeatIntervalSeconds"], out var heartbeatIntervalSeconds)) options.HeartbeatIntervalSeconds = heartbeatIntervalSeconds;
                if (int.TryParse(section["PendingCommandRetrySeconds"], out var pendingCommandRetrySeconds)) options.PendingCommandRetrySeconds = pendingCommandRetrySeconds;
                if (int.TryParse(section["MaxPendingCommandRetries"], out var maxPendingCommandRetries)) options.MaxPendingCommandRetries = maxPendingCommandRetries;
                if (int.TryParse(section["PendingCommandExpiryMinutes"], out var pendingCommandExpiryMinutes)) options.PendingCommandExpiryMinutes = pendingCommandExpiryMinutes;
            });
            services.AddSingleton<MqttClientService>();
            services.AddSingleton<IMqttPublisher, MqttPublisher>();
            services.AddSingleton<DeviceStatusSynchronization>();

            // ── 2. Cấu hình JWT Settings ───────────────────────────────────────
            services.Configure<JwtSettings>(options =>
            {
                var section = configuration.GetSection(JwtSettings.SectionName);
                options.SecretKey = section["SecretKey"] ?? string.Empty;
                options.Issuer = section["Issuer"] ?? string.Empty;
                options.Audience = section["Audience"] ?? string.Empty;
                if (int.TryParse(section["AccessTokenExpiryMinutes"], out var aExp))
                    options.AccessTokenExpiryMinutes = aExp;
                if (int.TryParse(section["RefreshTokenExpiryDays"], out var rExp))
                    options.RefreshTokenExpiryDays = rExp;
            });

            // ── 3. ASP.NET Core Identity (không Roles) ────────────────────────
            // IdentityUserContext đã được SmartFarmDbContext kế thừa
            // Chỉ đăng ký UserManager cho AppUser — KHÔNG có RoleManager
            services.AddIdentityCore<AppUser>(options =>
            {
                // Mật khẩu
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;

                // Tài khoản
                options.User.RequireUniqueEmail = true;

                // Email confirmation không bắt buộc (Q4)
                options.SignIn.RequireConfirmedEmail = false;

                // Lockout sau 5 lần sai
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<SmartFarmDbContext>();

            // ── 4. Repositories ───────────────────────────────────────────────
            services.AddScoped<IDeviceRepository, DeviceRepository>();
            services.AddScoped<ISensorReadingRepository, SensorReadingRepository>();
            services.AddScoped<ISensorReadingAggregateRepository, SensorReadingAggregateRepository>();
            services.AddScoped<IIrrigationRuleRepository, IrrigationRuleRepository>();
            services.AddScoped<IIrrigationLogRepository, IrrigationLogRepository>();
            services.AddScoped<IAlertRepository, AlertRepository>();
            services.AddScoped<IDeviceCommandRepository, DeviceCommandRepository>();
            services.AddScoped<ISystemLogRepository, SystemLogRepository>();

            // ── 5. Services ───────────────────────────────────────────────────
            services.Configure<GoogleAuthSettings>(options =>
            {
                var section = configuration.GetSection(GoogleAuthSettings.SectionName);
                options.ClientId = section["ClientId"] ?? string.Empty;
            });
            services.AddScoped<IGoogleAuthService, GoogleAuthService>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IAuthService, AuthService>();

            return services;
        }
    }
}
