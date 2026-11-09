using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    public class AlertConfiguration : IEntityTypeConfiguration<Alert>
    {
        public void Configure(EntityTypeBuilder<Alert> builder)
        {
            builder.ToTable("Alerts");

            builder.HasKey(a => a.Id);

            builder.Property(a => a.DeviceId)
                .IsRequired();

            builder.Property(a => a.AlertCode)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(a => a.Title)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(a => a.Message)
                .IsRequired()
                .HasMaxLength(1000);

            // Enum lưu TINYINT
            builder.Property(a => a.Severity)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(a => a.IsResolved)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(a => a.CreatedAtUtc)
                .IsRequired();

            builder.Property(a => a.ResolvedAtUtc);

            // Không cascade delete để bảo vệ lịch sử sự cố
            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(a => a.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            // Index dashboard — cảnh báo chưa xử lý theo thiết bị
            builder.HasIndex(a => new { a.DeviceId, a.IsResolved, a.CreatedAtUtc })
                .HasDatabaseName("IX_Alerts_DeviceId_IsResolved_Created");
        }
    }
}
