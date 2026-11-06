using Microsoft.OpenApi;

namespace SmartFarm.WebAPI.Extensions
{
    /// <summary>
    /// Các phương thức mở rộng cấu hình Swagger / OpenAPI cho Web API
    /// Hỗ trợ JWT Bearer Authentication trong Swagger UI.
    /// </summary>
    public static class SwaggerConfigurationExtensions
    {
        public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
        {
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Smart Farm Mini Web API",
                    Version = "v1",
                    Description = "RESTful Web API cho hệ thống IoT Smart Farm Mini — Giám sát cảm biến, quản lý thiết bị và tự động hóa quy tắc tưới cây."
                });

                // Cấu hình JWT Bearer trong Swagger UI
                var securityScheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Description = "Nhập JWT Bearer token theo định dạng: Bearer {token}",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT"
                };

                options.AddSecurityDefinition("Bearer", securityScheme);

                options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecuritySchemeReference("Bearer"),
                        new List<string>()
                    }
                });
            });

            return services;
        }

        public static IApplicationBuilder UseSwaggerDocumentation(this IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(options =>
                {
                    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Smart Farm Mini API v1");
                    options.RoutePrefix = "swagger";
                });
            }

            return app;
        }
    }
}
