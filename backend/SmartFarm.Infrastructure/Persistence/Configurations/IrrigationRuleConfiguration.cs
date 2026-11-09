using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho IrrigationRule.
    /// Thêm enum TINYINT conversion và CHECK constraints.
    /// </summary>
    public class IrrigationRuleConfiguration : IEntityTypeConfiguration<IrrigationRule>
    {
        public void Configure(EntityTypeBuilder<IrrigationRule> builder)
        {
            builder.ToTable("IrrigationRules");

            builder.HasKey(r => r.Id);

            builder.Property(r => r.DeviceId)
                .IsRequired();

            builder.Property(r => r.Name)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(r => r.MoistureThreshold)
                .IsRequired()
                .HasPrecision(5, 2);

            builder.Property(r => r.TargetMoisture)
                .IsRequired()
                .HasPrecision(5, 2);

            builder.Property(r => r.MinIntervalMinutes)
                .IsRequired();

            builder.Property(r => r.MaxDurationSeconds)
                .IsRequired();

            builder.Property(r => r.IsEnabled)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(r => r.CreatedAtUtc)
                .IsRequired();

            builder.Property(r => r.UpdatedAtUtc)
                .IsRequired();

            builder.Property(r => r.LastTriggeredAtUtc);

            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(r => r.DeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            // Index cho lấy quy tắc đang hoạt động của thiết bị
            builder.HasIndex(r => new { r.DeviceId, r.IsEnabled })
                .HasDatabaseName("IX_IrrigRules_DeviceId_IsEnabled");

            // Filtered Unique Index: Mỗi thiết bị chỉ có tối đa 1 quy tắc tưới đang BẬT (IsEnabled = 1)
            builder.HasIndex(r => r.DeviceId)
                .IsUnique()
                .HasFilter("[IsEnabled] = 1")
                .HasDatabaseName("IX_IrrigRules_OneActivePerDevice");

            // CHECK constraints phản ánh Domain validation
            builder.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_IrrigRules_TargetGtThreshold",
                    "[TargetMoisture] > [MoistureThreshold]");
                t.HasCheckConstraint(
                    "CK_IrrigRules_MoistureRange",
                    "[MoistureThreshold] >= 0 AND [MoistureThreshold] <= 100 AND [TargetMoisture] >= 0 AND [TargetMoisture] <= 100");
                t.HasCheckConstraint(
                    "CK_IrrigRules_MaxDuration",
                    "[MaxDurationSeconds] > 0 AND [MaxDurationSeconds] <= 300");
                t.HasCheckConstraint(
                    "CK_IrrigRules_MinInterval",
                    "[MinIntervalMinutes] >= 0");
            });
        }
    }
}
