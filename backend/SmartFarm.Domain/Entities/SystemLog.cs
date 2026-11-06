
using System;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    public class SystemLog
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // Mức độ nhật ký: Information, Warning, Error...
        public LogLevel Level { get; private set; }

        // Nguồn phát sinh nhật ký: Backend, MQTT, ESP32...
        public LogSource Source { get; private set; }

        // Mã sự kiện
        public string EventCode { get; private set; } = string.Empty;

        // Nội dung nhật ký
        public string Message { get; private set; } = string.Empty;

        // Chi tiết lỗi nếu có
        public string? ExceptionDetails { get; private set; }

        // ID thiết bị liên quan nếu có
        public Guid? DeviceId { get; private set; }

        // Thời điểm phát sinh nhật ký
        public DateTimeOffset CreatedAtUtc { get; private set; }

        public SystemLog(
            LogLevel level,
            LogSource source,
            string eventCode,
            string message,
            DateTimeOffset createdAtUtc,
            Guid? deviceId = null,
            string? exceptionDetails = null)
        {
            if (!Enum.IsDefined(typeof(LogLevel), level))
                throw new ArgumentOutOfRangeException(nameof(level));

            if (!Enum.IsDefined(typeof(LogSource), source))
                throw new ArgumentOutOfRangeException(nameof(source));

            if (string.IsNullOrWhiteSpace(eventCode))
                throw new ArgumentException(
                    "Event code cannot be empty.", nameof(eventCode));

            if (string.IsNullOrWhiteSpace(message))
                throw new ArgumentException(
                    "Message cannot be empty.", nameof(message));

            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            ValidateUtc(createdAtUtc, nameof(createdAtUtc));

            Id = Guid.NewGuid();
            Level = level;
            Source = source;
            EventCode = eventCode.Trim().ToUpperInvariant();
            Message = message.Trim();
            ExceptionDetails = NormalizeExceptionDetails(exceptionDetails);
            DeviceId = deviceId;
            CreatedAtUtc = createdAtUtc;
        }

        // Chuẩn hóa thông tin lỗi
        private static string? NormalizeExceptionDetails(string? details)
        {
            return string.IsNullOrWhiteSpace(details)
                ? null
                : details.Trim();
        }

        // Kiểm tra thời gian UTC
        private static void ValidateUtc(
            DateTimeOffset value,
            string parameterName)
        {
            if (value.Offset != TimeSpan.Zero)
                throw new ArgumentException(
                    "Timestamp must use UTC offset (+00:00).",
                    parameterName);
        }
    }
}
