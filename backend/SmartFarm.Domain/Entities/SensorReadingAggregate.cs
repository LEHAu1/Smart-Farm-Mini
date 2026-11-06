using System;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    /// <summary>
    /// Dữ liệu cảm biến được tổng hợp theo giờ.
    /// SensorReadings (raw) giữ 90 ngày, SensorReadingAggregates giữ vĩnh viễn.
    /// Cho phép xem xu hướng lịch sử dài hạn mà không cần lưu dữ liệu thô mãi.
    /// </summary>
    public class SensorReadingAggregate
    {
        // Khóa chính
        public Guid Id { get; set; }

        // Thiết bị
        public Guid DeviceId { get; set; }

        // Loại cảm biến
        public SensorType SensorType { get; set; }

        // Đầu giờ UTC (ví dụ: 2026-11-05 10:00:00 +00:00)
        // Composite Unique: (DeviceId, SensorType, HourBucket) — đảm bảo idempotent aggregation
        public DateTimeOffset HourBucket { get; set; }

        // Giá trị trung bình trong giờ
        public decimal AvgValue { get; set; }

        // Giá trị nhỏ nhất trong giờ
        public decimal MinValue { get; set; }

        // Giá trị lớn nhất trong giờ
        public decimal MaxValue { get; set; }

        // Số lần đọc trong giờ
        public int SampleCount { get; set; }

        // Đơn vị
        public string Unit { get; set; } = string.Empty;

        // Thời điểm chạy aggregation (UTC)
        public DateTimeOffset AggregatedAtUtc { get; set; }
    }
}

