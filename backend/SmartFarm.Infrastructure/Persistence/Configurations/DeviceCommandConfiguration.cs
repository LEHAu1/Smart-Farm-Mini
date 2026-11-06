using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Cấu hình Fluent API cho DeviceCommand.
    /// BUG-01 ĐÃ FIX: CommandCode KHÔNG có IsUnique() — đây là loại lệnh, không phải ID.
    /// </summary>
    public class DeviceCommandConfiguration : IEntityTypeConfiguration<DeviceCommand>
    {
        public void Configure(EntityTypeBuilder<DeviceCommand> builder)
        {
            builder.ToTable("DeviceCommands");

            builder.HasKey(c => c.Id);

            builder.Property(c => c.DeviceId)
                .IsRequired();

            // CommandCode — loại lệnh (ví dụ: START_PUMP), KHÔNG Unique
            builder.Property(c => c.CommandCode)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(c => c.Action)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(c => c.Payload);

            // Enum lưu TINYINT
            builder.Property(c => c.Status)
                .IsRequired()
                .HasConversion<byte>()
                .HasDefaultValue(CommandStatus.Pending);

            builder.Property(c => c.CreatedAtUtc)
                .IsRequired();

            builder.Property(c => c.AcknowledgedAtUtc);

            builder.Property(c => c.CompletedAtUtc);

            builder.Property(c => c.ErrorMessage)
                .HasMaxLength(1000);

            builder.HasOne<Device>()
                .WithMany()
                .HasForeignKey(c => c.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);

            // Index tra lệnh đang Pending của thiết bị
            builder.HasIndex(c => new { c.DeviceId, c.Status })
                .HasDatabaseName("IX_DevCmds_DeviceId_Status");

            // Filtered index cho cleanup lệnh cũ Completed/Failed
            builder.HasIndex(c => c.CreatedAtUtc)
                .HasFilter("[Status] IN (3, 4)")
                .HasDatabaseName("IX_DevCmds_CreatedAt_Done");
        }
    }
}
