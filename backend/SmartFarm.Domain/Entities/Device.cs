
using System;

namespace SmartFarm.Domain.Entities
{
    public class Device
    {
        // Khóa chính của thiết bị
        public Guid Id { get; private set; }

        // ID người dùng sở hữu thiết bị — FK → AspNetUsers.Id
        public Guid OwnerId { get; private set; }

        // Mã định danh thiết bị, ví dụ: ESP32-POT-001
        public string DeviceCode { get; private set; } = string.Empty;

        // Tên thiết bị
        public string Name { get; private set; } = string.Empty;

        // Mô tả thiết bị
        public string? Description { get; private set; }

        // Trạng thái kết nối của ESP32
        public bool IsOnline { get; private set; }

        // Trạng thái hoạt động của thiết bị trong hệ thống
        public bool IsActive { get; private set; }

        // Thời điểm thiết bị được tạo
        public DateTimeOffset CreatedAtUtc { get; private set; }

        // Thời điểm thông tin thiết bị được cập nhật gần nhất
        public DateTimeOffset UpdatedAtUtc { get; private set; }

        // Thời điểm cuối cùng nhận được tín hiệu từ ESP32
        public DateTimeOffset? LastSeenAtUtc { get; private set; }

        // Constructor dành cho việc khởi tạo Entity
        public Device(
            Guid ownerId,
            string deviceCode,
            string name,
            DateTimeOffset createdAtUtc,
            string? description = null)
        {
            if (ownerId == Guid.Empty)
                throw new ArgumentException("Owner ID cannot be empty.", nameof(ownerId));

            if (string.IsNullOrWhiteSpace(deviceCode))
                throw new ArgumentException("Device code cannot be empty.", nameof(deviceCode));

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Device name cannot be empty.", nameof(name));

            ValidateUtc(createdAtUtc, nameof(createdAtUtc));

            Id = Guid.NewGuid();
            OwnerId = ownerId;
            DeviceCode = deviceCode.Trim().ToUpperInvariant();
            Name = name.Trim();
            Description = NormalizeDescription(description);

            IsOnline = false;
            IsActive = true;

            CreatedAtUtc = createdAtUtc;
            UpdatedAtUtc = createdAtUtc;
        }

        // Cập nhật thông tin thiết bị
        public void UpdateInformation(
            string name,
            string? description,
            DateTimeOffset updatedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Device name cannot be empty.", nameof(name));

            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            Name = name.Trim();
            Description = NormalizeDescription(description);
            UpdatedAtUtc = updatedAtUtc;
        }

        // Đánh dấu thiết bị đang online
        public void MarkOnline(DateTimeOffset lastSeenAtUtc)
        {
            ValidateUtc(lastSeenAtUtc, nameof(lastSeenAtUtc));
            ValidateUpdateTime(lastSeenAtUtc);

            if (!IsActive)
                throw new InvalidOperationException("Inactive device cannot be marked online.");

            IsOnline = true;
            LastSeenAtUtc = lastSeenAtUtc;
            UpdatedAtUtc = lastSeenAtUtc;
        }

        // Đánh dấu thiết bị offline
        public void MarkOffline(DateTimeOffset updatedAtUtc)
        {
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            IsOnline = false;
            UpdatedAtUtc = updatedAtUtc;
        }

        // Vô hiệu hóa thiết bị
        public void Deactivate(DateTimeOffset updatedAtUtc)
        {
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            IsActive = false;
            IsOnline = false;
            UpdatedAtUtc = updatedAtUtc;
        }

        // Kích hoạt lại thiết bị
        public void Activate(DateTimeOffset updatedAtUtc)
        {
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            IsActive = true;
            UpdatedAtUtc = updatedAtUtc;
        }

        // Chuẩn hóa mô tả
        private static string? NormalizeDescription(string? description)
        {
            return string.IsNullOrWhiteSpace(description)
                ? null
                : description.Trim();
        }

        // Đảm bảo thời gian được truyền vào là UTC
        private static void ValidateUtc(DateTimeOffset value, string parameterName)
        {
            if (value.Offset != TimeSpan.Zero)
            {
                throw new ArgumentException(
                    "Timestamp must use UTC offset (+00:00).",
                    parameterName);
            }
        }

        // Không cho phép thời gian cập nhật đi ngược thời gian
        private void ValidateUpdateTime(DateTimeOffset value)
        {
            if (value < CreatedAtUtc || value < UpdatedAtUtc)
            {
                throw new ArgumentException(
                    "Update time cannot be earlier than the previous timestamp.");
            }
        }
    }
}
