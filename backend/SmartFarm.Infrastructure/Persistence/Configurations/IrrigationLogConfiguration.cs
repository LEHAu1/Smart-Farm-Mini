using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    public class IrrigationLogConfiguration : IEntityTypeConfiguration<IrrigationLog>
    {
        public void Configure(EntityTypeBuilder<IrrigationLog> builder)
        {
            builder.ToTable("IrrigationLogs");

            builder.HasKey(l => l.Id);

            builder.Property(l => l.DeviceId)
                .IsRequired();

            // Enum lưu TINYINT
            builder.Property(l => l.Mode)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(l => l.Status)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(l => l.SoilMoistureBefore)
                .HasPrecision(5, 2);

            builder.Property(l => l.SoilMoistureAfter)
                .HasPrecision(5, 2);

            builder.Property(l => l.WaterAmountMl)
                .HasPrecision(8, 2);

            builder.Property(l => l.StartedAtUtc)
                .IsRequired();

            builder.Property(l => l.CompletedAtUtc);

            builder.Property(l => l.Note)
                .HasMaxLength(500);

            builder.Property(l => l.DurationSeconds);

            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(l => l.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);

            // Index lịch sử tưới theo thiết bị
            builder.HasIndex(l => new { l.DeviceId, l.StartedAtUtc })
                .HasDatabaseName("IX_IrrigLogs_DeviceId_StartedAt");

            // Filtered index — tìm phiên tưới đang InProgress (Status = 1)
            builder.HasIndex(l => l.Status)
                .HasFilter("[Status] = 1")
                .HasDatabaseName("IX_IrrigLogs_InProgress");
        }
    }
}
