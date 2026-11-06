
using System;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    public class Alert
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // Thiết bị phát sinh cảnh báo
        public Guid DeviceId { get; private set; }

        // Mã cảnh báo: LOW_SOIL_MOISTURE, LOW_WATER_LEVEL...
        public string AlertCode { get; private set; } = string.Empty;

        // Tiêu đề cảnh báo
        public string Title { get; private set; } = string.Empty;

        // Nội dung chi tiết
        public string Message { get; private set; } = string.Empty;

        // Mức độ nghiêm trọng
        public AlertSeverity Severity { get; private set; }

        // Trạng thái đã xử lý hay chưa
        public bool IsResolved { get; private set; }

        // Thời điểm phát sinh cảnh báo
        public DateTimeOffset CreatedAtUtc { get; private set; }

        // Thời điểm xử lý cảnh báo
        public DateTimeOffset? ResolvedAtUtc { get; private set; }

        public Alert(
            Guid deviceId,
            string alertCode,
            string title,
            string message,
            AlertSeverity severity,
            DateTimeOffset createdAtUtc)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            if (string.IsNullOrWhiteSpace(alertCode))
                throw new ArgumentException(
                    "Alert code cannot be empty.", nameof(alertCode));

            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException(
                    "Alert title cannot be empty.", nameof(title));

            if (string.IsNullOrWhiteSpace(message))
                throw new ArgumentException(
                    "Alert message cannot be empty.", nameof(message));

            if (!Enum.IsDefined(typeof(AlertSeverity), severity))
                throw new ArgumentOutOfRangeException(nameof(severity));

            ValidateUtc(createdAtUtc, nameof(createdAtUtc));

            Id = Guid.NewGuid();
            DeviceId = deviceId;
            AlertCode = alertCode.Trim().ToUpperInvariant();
            Title = title.Trim();
            Message = message.Trim();
            Severity = severity;

            IsResolved = false;
            CreatedAtUtc = createdAtUtc;
        }

        // Đánh dấu cảnh báo đã được xử lý
        public void Resolve(DateTimeOffset resolvedAtUtc)
        {
            ValidateUtc(resolvedAtUtc, nameof(resolvedAtUtc));

            if (resolvedAtUtc < CreatedAtUtc)
                throw new ArgumentException(
                    "Resolved time cannot be earlier than created time.",
                    nameof(resolvedAtUtc));

            if (IsResolved)
                throw new InvalidOperationException(
                    "Alert has already been resolved.");

            IsResolved = true;
            ResolvedAtUtc = resolvedAtUtc;
        }

        // Kiểm tra thời gian UTC
        private static void ValidateUtc(
            DateTimeOffset value,
            string parameterName)
        {
            if (value.Offset != TimeSpan.Zero)
            {
                throw new ArgumentException(
                    "Timestamp must use UTC offset (+00:00).",
                    parameterName);
            }
        }
    }
}
