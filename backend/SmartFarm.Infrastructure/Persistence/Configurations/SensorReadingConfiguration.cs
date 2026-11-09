using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho SensorReading (dữ liệu thô, lưu 90 ngày).
    /// </summary>
    public class SensorReadingConfiguration : IEntityTypeConfiguration<SensorReading>
    {
        public void Configure(EntityTypeBuilder<SensorReading> builder)
        {
            builder.ToTable("SensorReadings");

            builder.HasKey(s => s.Id);

            builder.Property(s => s.DeviceId)
                .IsRequired();

            // Khóa phụ chống duplicate từ MQTT Telemetry (Idempotency)
            builder.Property(s => s.MessageId)
                .IsRequired(false);

            // Enum lưu dưới dạng TINYINT (byte)
            builder.Property(s => s.SensorType)
                .IsRequired()
                .HasConversion<byte>();

            builder.Property(s => s.Value)
                .IsRequired()
                .HasPrecision(10, 2);

            builder.Property(s => s.Unit)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(s => s.RecordedAtUtc)
                .IsRequired();

            builder.Property(s => s.ReceivedAtUtc)
                .IsRequired();

            // Bảo vệ dữ liệu lịch sử đo: không cascade delete khi thiết bị bị xóa/deactivate
            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(s => s.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique Filtered Index chống duplicate gói tin MQTT khi reconnect
            builder.HasIndex(s => new { s.MessageId, s.SensorType })
                .IsUnique()
                .HasFilter("[MessageId] IS NOT NULL")
                .HasDatabaseName("IX_SensorReadings_MessageId_SensorType");

            // Index chính cho time-series query theo thiết bị
            builder.HasIndex(s => new { s.DeviceId, s.RecordedAtUtc })
                .HasDatabaseName("IX_SensorReadings_DeviceId_RecordedAt");

            // Index cho filter theo loại cảm biến
            builder.HasIndex(s => new { s.SensorType, s.RecordedAtUtc })
                .HasDatabaseName("IX_SensorReadings_SensorType_RecordedAt");

            // CHECK constraint tính hợp lệ thời gian nhận và đo
            builder.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_SensorReadings_ReceivedAfterRecorded",
                    "[ReceivedAtUtc] >= [RecordedAtUtc]");
            });
        }
    }
}
