using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Identity;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho RefreshToken.
    /// Hỗ trợ: hash, rotation, revocation, token family, reuse detection.
    /// </summary>
    public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.ToTable("RefreshTokens");

            builder.HasKey(t => t.Id);

            builder.Property(t => t.UserId)
                .IsRequired();

            // SHA-256 hash dạng Base64Url — tối đa 88 ký tự
            builder.Property(t => t.TokenHash)
                .IsRequired()
                .HasMaxLength(88);

            builder.Property(t => t.TokenFamily)
                .IsRequired();

            builder.Property(t => t.ExpiresAtUtc)
                .IsRequired();

            builder.Property(t => t.CreatedAtUtc)
                .IsRequired();

            builder.Property(t => t.RevokedAtUtc);

            builder.Property(t => t.ReplacedByTokenHash)
                .HasMaxLength(88);

            builder.Property(t => t.RevokeReason)
                .HasMaxLength(100);

            // FK → AspNetUsers.Id — Cascade: xóa user xóa toàn bộ token
            builder.HasOne<AppUser>()
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique: mỗi hash là duy nhất tuyệt đối
            builder.HasIndex(t => t.TokenHash)
                .IsUnique()
                .HasDatabaseName("IX_RefreshTokens_TokenHash");

            // Index cho revoke toàn bộ family (reuse detection)
            builder.HasIndex(t => t.TokenFamily)
                .HasDatabaseName("IX_RefreshTokens_TokenFamily");

            // Index cho lấy token của user (logout)
            builder.HasIndex(t => t.UserId)
                .HasDatabaseName("IX_RefreshTokens_UserId");

            // Filtered index cho cleanup token hết hạn còn active
            builder.HasIndex(t => t.ExpiresAtUtc)
                .HasFilter("[RevokedAtUtc] IS NULL")
                .HasDatabaseName("IX_RefreshTokens_ExpiresAtUtc_Active");
        }
    }
}

