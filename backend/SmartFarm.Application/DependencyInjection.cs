using Microsoft.Extensions.DependencyInjection;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.Services;

namespace SmartFarm.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // ── Device ────────────────────────────────────────────────
            services.AddScoped<IDeviceService, DeviceService>();

            // ── Dashboard ─────────────────────────────────────────────
            services.AddScoped<IDashboardService, DashboardService>();

            // ── Sensor ────────────────────────────────────────────────
            services.AddScoped<ISensorService, SensorService>();

            // ── Irrigation ────────────────────────────────────────────
            services.AddScoped<IIrrigationService, IrrigationService>();

            // ── Alert ─────────────────────────────────────────────────
            services.AddScoped<IAlertService, AlertService>();

            // ── Device Command ────────────────────────────────────────
            services.AddScoped<IDeviceCommandService, DeviceCommandService>();

            // ── System Log ────────────────────────────────────────────
            services.AddScoped<ISystemLogService, SystemLogService>();

            return services;
        }
    }
}

