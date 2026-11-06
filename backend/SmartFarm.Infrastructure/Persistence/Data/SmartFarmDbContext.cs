using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Identity;

namespace SmartFarm.Infrastructure.Persistence.Data
{
    /// <summary>
    /// Database Context chính của Smart Farm Mini.
    /// Kế thừa IdentityUserContext&lt;AppUser, Guid&gt; — tạo 4 bảng Identity (không có Roles).
    /// Bảng được tạo: AspNetUsers, AspNetUserClaims, AspNetUserLogins, AspNetUserTokens.
    /// </summary>
    public class SmartFarmDbContext : IdentityUserContext<AppUser, Guid>
    {
        public SmartFarmDbContext(DbContextOptions<SmartFarmDbContext> options)
            : base(options)
        {
        }

        // ── Custom Authentication ──────────────────────────────
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        // ── Domain — Smart Farm ────────────────────────────────
        public DbSet<Device> Devices => Set<Device>();
        public DbSet<SensorReading> SensorReadings => Set<SensorReading>();
        public DbSet<SensorReadingAggregate> SensorReadingAggregates => Set<SensorReadingAggregate>();
        public DbSet<IrrigationRule> IrrigationRules => Set<IrrigationRule>();
        public DbSet<IrrigationLog> IrrigationLogs => Set<IrrigationLog>();
        public DbSet<Alert> Alerts => Set<Alert>();
        public DbSet<DeviceCommand> DeviceCommands => Set<DeviceCommand>();
        public DbSet<SystemLog> SystemLogs => Set<SystemLog>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Gọi base để tạo 4 bảng Identity chuẩn
            base.OnModelCreating(modelBuilder);

            // Tự động quét và nạp toàn bộ cấu hình Fluent API trong Assembly Infrastructure
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SmartFarmDbContext).Assembly);
        }
    }
}
