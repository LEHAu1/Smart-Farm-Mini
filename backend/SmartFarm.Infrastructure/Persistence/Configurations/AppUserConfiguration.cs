using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Infrastructure.Identity;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho AppUser (mở rộng IdentityUser).
    /// Hỗ trợ trường mở rộng GoogleSubjectId, AuthProvider, AvatarUrl.
    /// </summary>
    public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
    {
        public void Configure(EntityTypeBuilder<AppUser> builder)
        {
            builder.Property(u => u.DisplayName)
                .HasMaxLength(100);

            builder.Property(u => u.GoogleSubjectId)
                .HasMaxLength(128);

            // Filtered Unique Index trên GoogleSubjectId để chống trùng lặp tài khoản Google
            builder.HasIndex(u => u.GoogleSubjectId)
                .IsUnique()
                .HasFilter("[GoogleSubjectId] IS NOT NULL")
                .HasDatabaseName("IX_AspNetUsers_GoogleSubjectId");

            builder.Property(u => u.AuthProvider)
                .HasMaxLength(50)
                .HasDefaultValue("Local");

            builder.Property(u => u.AvatarUrl)
                .HasMaxLength(500);

            builder.Property(u => u.CreatedAtUtc)
                .IsRequired();
        }
    }
}
