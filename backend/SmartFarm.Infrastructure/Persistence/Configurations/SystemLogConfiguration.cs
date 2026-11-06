using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    public class SystemLogConfiguration : IEntityTypeConfiguration<SystemLog>
    {
        public void Configure(EntityTypeBuilder<SystemLog> builder)
        {
            builder.ToTable("SystemLogs");

            builder.HasKey(s => s.Id);

            // Enum lưu TINYINT
            builder.Property(s => s.Level)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(s => s.Source)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(s => s.EventCode)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(s => s.Message)
                .IsRequired();

            builder.Property(s => s.ExceptionDetails);

            // DeviceId nullable — SET NULL khi Device bị xóa
            builder.Property(s => s.DeviceId);

            builder.Property(s => s.CreatedAtUtc)
                .IsRequired();

            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(s => s.DeviceId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Index lọc log theo mức độ
            builder.HasIndex(s => new { s.Level, s.CreatedAtUtc })
                .HasDatabaseName("IX_SysLogs_Level_CreatedAt");

            // Filtered index — log có liên quan thiết bị
            builder.HasIndex(s => new { s.DeviceId, s.CreatedAtUtc })
                .HasFilter("[DeviceId] IS NOT NULL")
                .HasDatabaseName("IX_SysLogs_DeviceId_CreatedAt");
        }
    }
}
