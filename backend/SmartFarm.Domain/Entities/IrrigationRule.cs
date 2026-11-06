using System;
using SmartFarm.Domain.Constants;

namespace SmartFarm.Domain.Entities
{
    public class IrrigationRule
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // Thiết bị áp dụng quy tắc
        public Guid DeviceId { get; private set; }

        // Tên quy tắc
        public string Name { get; private set; } = string.Empty;

        // Độ ẩm đất tối thiểu để kích hoạt tưới (%)
        public decimal MoistureThreshold { get; private set; }

        // Độ ẩm mục tiêu sau khi tưới (%)
        public decimal TargetMoisture { get; private set; }

        // Khoảng thời gian tối thiểu giữa hai lần tưới (phút)
        public int MinIntervalMinutes { get; private set; }

        // Thời gian tưới tối đa cho một lần (giây)
        public int MaxDurationSeconds { get; private set; }

        // Quy tắc có đang được kích hoạt hay không
        public bool IsEnabled { get; private set; }

        // Thời điểm tạo quy tắc
        public DateTimeOffset CreatedAtUtc { get; private set; }

        // Thời điểm cập nhật quy tắc gần nhất
        public DateTimeOffset UpdatedAtUtc { get; private set; }

        // Thời điểm kích hoạt tưới gần nhất
        public DateTimeOffset? LastTriggeredAtUtc { get; private set; }

        public IrrigationRule(
            Guid deviceId,
            string name,
            decimal moistureThreshold,
            decimal targetMoisture,
            int minIntervalMinutes,
            int maxDurationSeconds,
            DateTimeOffset createdAtUtc)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException(
                    "Rule name cannot be empty.", nameof(name));

            ValidateMoistureSettings(
                moistureThreshold, targetMoisture);

            ValidateInterval(minIntervalMinutes);
            ValidateMaxDuration(maxDurationSeconds);
            ValidateUtc(createdAtUtc, nameof(createdAtUtc));

            Id = Guid.NewGuid();
            DeviceId = deviceId;
            Name = name.Trim();

            MoistureThreshold = moistureThreshold;
            TargetMoisture = targetMoisture;

            MinIntervalMinutes = minIntervalMinutes;
            MaxDurationSeconds = maxDurationSeconds;

            IsEnabled = true;
            CreatedAtUtc = createdAtUtc;
            UpdatedAtUtc = createdAtUtc;
        }

        // Cập nhật cấu hình quy tắc tưới
        public void UpdateSettings(
            string name,
            decimal moistureThreshold,
            decimal targetMoisture,
            int minIntervalMinutes,
            int maxDurationSeconds,
            DateTimeOffset updatedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException(
                    "Rule name cannot be empty.", nameof(name));

            ValidateMoistureSettings(
                moistureThreshold, targetMoisture);

            ValidateInterval(minIntervalMinutes);
            ValidateMaxDuration(maxDurationSeconds);
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            Name = name.Trim();
            MoistureThreshold = moistureThreshold;
            TargetMoisture = targetMoisture;
            MinIntervalMinutes = minIntervalMinutes;
            MaxDurationSeconds = maxDurationSeconds;

            UpdatedAtUtc = updatedAtUtc;
        }

        // Bật quy tắc tưới tự động
        public void Enable(DateTimeOffset updatedAtUtc)
        {
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            IsEnabled = true;
            UpdatedAtUtc = updatedAtUtc;
        }

        // Tắt quy tắc tưới tự động
        public void Disable(DateTimeOffset updatedAtUtc)
        {
            ValidateUtc(updatedAtUtc, nameof(updatedAtUtc));
            ValidateUpdateTime(updatedAtUtc);

            IsEnabled = false;
            UpdatedAtUtc = updatedAtUtc;
        }

        // Kiểm tra điều kiện độ ẩm có cần tưới hay không
        public bool ShouldTrigger(decimal currentMoisture)
        {
            if (!IsEnabled)
                return false;

            if (currentMoisture < IrrigationConstants.MinSoilMoisture || currentMoisture > IrrigationConstants.MaxSoilMoisture)
                throw new ArgumentOutOfRangeException(
                    nameof(currentMoisture),
                    $"Soil moisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            return currentMoisture <= MoistureThreshold
                && currentMoisture < TargetMoisture;
        }

        // Ghi nhận thời điểm quy tắc được kích hoạt
        public void RecordTrigger(DateTimeOffset triggeredAtUtc)
        {
            ValidateUtc(triggeredAtUtc, nameof(triggeredAtUtc));
            ValidateUpdateTime(triggeredAtUtc);

            if (!IsEnabled)
                throw new InvalidOperationException(
                    "Cannot trigger a disabled irrigation rule.");

            if (LastTriggeredAtUtc.HasValue &&
                triggeredAtUtc <
                LastTriggeredAtUtc.Value.AddMinutes(MinIntervalMinutes))
            {
                throw new InvalidOperationException(
                    "Minimum interval between irrigation triggers has not elapsed.");
            }

            LastTriggeredAtUtc = triggeredAtUtc;
            UpdatedAtUtc = triggeredAtUtc;
        }

        private static void ValidateMoistureSettings(
            decimal moistureThreshold,
            decimal targetMoisture)
        {
            if (moistureThreshold < IrrigationConstants.MinSoilMoisture || moistureThreshold > IrrigationConstants.MaxSoilMoisture)
                throw new ArgumentOutOfRangeException(
                    nameof(moistureThreshold),
                    $"Moisture threshold must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (targetMoisture < IrrigationConstants.MinSoilMoisture || targetMoisture > IrrigationConstants.MaxSoilMoisture)
                throw new ArgumentOutOfRangeException(
                    nameof(targetMoisture),
                    $"Target moisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (targetMoisture <= moistureThreshold)
                throw new ArgumentException(
                    "Target moisture must be greater than moisture threshold.");
        }

        private static void ValidateInterval(int value)
        {
            if (value < 0)
                throw new ArgumentOutOfRangeException(
                    nameof(value),
                    "Minimum interval cannot be negative.");
        }

        private static void ValidateMaxDuration(int value)
        {
            if (value <= 0)
                throw new ArgumentOutOfRangeException(
                    nameof(value),
                    "Maximum irrigation duration must be greater than zero.");
        }

        private void ValidateUpdateTime(DateTimeOffset value)
        {
            if (value < CreatedAtUtc || value < UpdatedAtUtc)
                throw new ArgumentException(
                    "Update time cannot be earlier than the previous timestamp.");
        }

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
