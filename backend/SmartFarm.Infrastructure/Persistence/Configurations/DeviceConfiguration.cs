using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Identity;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho Device.
    /// Thêm OwnerId (FK → AspNetUsers), OnDelete = Restrict.
    /// </summary>
    public class DeviceConfiguration : IEntityTypeConfiguration<Device>
    {
        public void Configure(EntityTypeBuilder<Device> builder)
        {
            builder.ToTable("Devices");

            builder.HasKey(d => d.Id);

            // OwnerId — FK → AspNetUsers.Id, Restrict (không xóa User khi còn Device)
            builder.Property(d => d.OwnerId)
                .IsRequired();

            builder.HasOne<AppUser>()
                .WithMany(u => u.Devices)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(d => d.OwnerId)
                .HasDatabaseName("IX_Devices_OwnerId");

            // DeviceCode — Unique
            builder.Property(d => d.DeviceCode)
                .IsRequired()
                .HasMaxLength(50);

            builder.HasIndex(d => d.DeviceCode)
                .IsUnique()
                .HasDatabaseName("IX_Devices_DeviceCode");

            builder.Property(d => d.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(d => d.Description)
                .HasMaxLength(500);

            builder.Property(d => d.IsOnline)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(d => d.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(d => d.CreatedAtUtc)
                .IsRequired();

            builder.Property(d => d.UpdatedAtUtc)
                .IsRequired();

            builder.Property(d => d.LastSeenAtUtc);
        }
    }
}
