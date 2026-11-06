using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Infrastructure.Identity;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho AppUser (mở rộng IdentityUser).
    /// Chỉ cấu hình các cột custom; các cột Identity chuẩn được IdentityUserContext xử lý.
    /// </summary>
    public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
    {
        public void Configure(EntityTypeBuilder<AppUser> builder)
        {
            builder.Property(u => u.DisplayName)
                .HasMaxLength(100);

            builder.Property(u => u.CreatedAtUtc)
                .IsRequired();

            // Index trên OwnerId đã có qua Identity; không cần thêm.
        }
    }
}

