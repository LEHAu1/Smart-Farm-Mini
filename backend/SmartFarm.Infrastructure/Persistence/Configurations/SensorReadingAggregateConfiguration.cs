using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho SensorReadingAggregate (dữ liệu tổng hợp theo giờ, lưu vĩnh viễn).
    /// Composite Unique (DeviceId, SensorType, HourBucket) đảm bảo idempotent aggregation.
    /// </summary>
    public class SensorReadingAggregateConfiguration : IEntityTypeConfiguration<SensorReadingAggregate>
    {
        public void Configure(EntityTypeBuilder<SensorReadingAggregate> builder)
        {
            builder.ToTable("SensorReadingAggregates");

            builder.HasKey(a => a.Id);

            builder.Property(a => a.DeviceId)
                .IsRequired();

            // Enum lưu TINYINT
            builder.Property(a => a.SensorType)
                .IsRequired()
                .HasConversion<byte>();

            // Đầu giờ UTC — phải là :00:00 (enforce ở Background Service)
            builder.Property(a => a.HourBucket)
                .IsRequired();

            builder.Property(a => a.AvgValue)
                .IsRequired()
                .HasPrecision(10, 2);

            builder.Property(a => a.MinValue)
                .IsRequired()
                .HasPrecision(10, 2);

            builder.Property(a => a.MaxValue)
                .IsRequired()
                .HasPrecision(10, 2);

            builder.Property(a => a.SampleCount)
                .IsRequired();

            builder.Property(a => a.Unit)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(a => a.AggregatedAtUtc)
                .IsRequired();

            // Không xóa cascade để bảo vệ lịch sử thống kê vĩnh viễn
            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(a => a.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            // Composite Unique — đảm bảo idempotent aggregation
            builder.HasIndex(a => new { a.DeviceId, a.SensorType, a.HourBucket })
                .IsUnique()
                .HasDatabaseName("IX_SensorAgg_Device_Type_Hour");

            // CHECK constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("CK_SensorAgg_SampleCount", "[SampleCount] > 0");
                t.HasCheckConstraint("CK_SensorAgg_Values", "[MinValue] <= [AvgValue] AND [AvgValue] <= [MaxValue]");
                t.HasCheckConstraint("CK_SensorAgg_SensorType", "[SensorType] BETWEEN 1 AND 5");
            });
        }
    }
}
