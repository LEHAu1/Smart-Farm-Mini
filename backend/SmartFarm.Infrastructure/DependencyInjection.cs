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
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IAuthService, AuthService>();

            return services;
        }
    }
}
