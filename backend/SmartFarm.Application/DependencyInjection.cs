using Microsoft.Extensions.DependencyInjection;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.Services;

namespace SmartFarm.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IDeviceService, DeviceService>();
            return services;
        }
    }
}

