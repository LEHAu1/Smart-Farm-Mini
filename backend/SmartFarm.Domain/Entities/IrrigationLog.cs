using System;
using SmartFarm.Domain.Constants;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    public class IrrigationLog
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // Thiết bị thực hiện tưới
        public Guid DeviceId { get; private set; }

        // Chế độ tưới: Manual hoặc Automatic
        public IrrigationMode Mode { get; private set; }

        // Trạng thái lần tưới
        public IrrigationStatus Status { get; private set; }

        // Độ ẩm đất trước khi tưới (%)
        public decimal? SoilMoistureBefore { get; private set; }

        // Độ ẩm đất sau khi tưới (%)
        public decimal? SoilMoistureAfter { get; private set; }

        // Lượng nước đã sử dụng (ml)
        public decimal? WaterAmountMl { get; private set; }

        // Thời điểm bắt đầu tưới
        public DateTimeOffset StartedAtUtc { get; private set; }

        // Thời điểm kết thúc tưới
        public DateTimeOffset? CompletedAtUtc { get; private set; }

        // Ghi chú hoặc lý do dừng tưới
        public string? Note { get; private set; }

        // Thời gian tưới tính bằng giây
        public int? DurationSeconds { get; private set; }

        public IrrigationLog(
            Guid deviceId,
            IrrigationMode mode,
            DateTimeOffset startedAtUtc,
            decimal? soilMoistureBefore = null)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            if (!Enum.IsDefined(typeof(IrrigationMode), mode))
                throw new ArgumentOutOfRangeException(nameof(mode));

            ValidateUtc(startedAtUtc, nameof(startedAtUtc));
            ValidateMoisture(soilMoistureBefore, nameof(soilMoistureBefore));

            Id = Guid.NewGuid();
            DeviceId = deviceId;
            Mode = mode;
            Status = IrrigationStatus.InProgress;
            StartedAtUtc = startedAtUtc;
            SoilMoistureBefore = soilMoistureBefore;
        }

        // Hoàn thành lần tưới
        public void Complete(
            DateTimeOffset completedAtUtc,
            decimal? soilMoistureAfter,
            decimal? waterAmountMl)
        {
            EnsureInProgress();

            ValidateUtc(completedAtUtc, nameof(completedAtUtc));
            ValidateCompletionTime(completedAtUtc);
            ValidateMoisture(soilMoistureAfter, nameof(soilMoistureAfter));
            ValidateWaterAmount(waterAmountMl, nameof(waterAmountMl));

            CompletedAtUtc = completedAtUtc;
            SoilMoistureAfter = soilMoistureAfter;
            WaterAmountMl = waterAmountMl;
            DurationSeconds = CalculateDuration(completedAtUtc);
            Status = IrrigationStatus.Completed;
        }

        // Dừng lần tưới
        public void Stop(
            DateTimeOffset stoppedAtUtc,
            string? note = null)
        {
            EnsureInProgress();

            ValidateUtc(stoppedAtUtc, nameof(stoppedAtUtc));
            ValidateCompletionTime(stoppedAtUtc);

            CompletedAtUtc = stoppedAtUtc;
            DurationSeconds = CalculateDuration(stoppedAtUtc);
            Note = NormalizeNote(note);
            Status = IrrigationStatus.Stopped;
        }

        // Đánh dấu lần tưới thất bại
        public void Fail(
            DateTimeOffset failedAtUtc,
            string reason)
        {
            EnsureInProgress();

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException(
                    "Failure reason cannot be empty.", nameof(reason));

            ValidateUtc(failedAtUtc, nameof(failedAtUtc));
            ValidateCompletionTime(failedAtUtc);

            CompletedAtUtc = failedAtUtc;
            DurationSeconds = CalculateDuration(failedAtUtc);
            Note = reason.Trim();
            Status = IrrigationStatus.Failed;
        }

        private void EnsureInProgress()
        {
            if (Status != IrrigationStatus.InProgress)
                throw new InvalidOperationException(
                    "Irrigation is no longer in progress.");
        }

        private void ValidateCompletionTime(DateTimeOffset value)
        {
            if (value < StartedAtUtc)
                throw new ArgumentException(
                    "Completion time cannot be earlier than start time.");
        }

        private int CalculateDuration(DateTimeOffset endTime)
        {
            return checked((int)(endTime - StartedAtUtc).TotalSeconds);
        }

        private static void ValidateMoisture(
            decimal? value,
            string parameterName)
        {
            if (value.HasValue && (value.Value < IrrigationConstants.MinSoilMoisture || value.Value > IrrigationConstants.MaxSoilMoisture))
                throw new ArgumentOutOfRangeException(
                    parameterName, $"Soil moisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");
        }

        private static void ValidateWaterAmount(
            decimal? value,
            string parameterName)
        {
            if (value.HasValue && value.Value < IrrigationConstants.MinWaterAmountMl)
                throw new ArgumentOutOfRangeException(
                    parameterName, "Water amount cannot be negative.");
        }

        private static string? NormalizeNote(string? note)
        {
            return string.IsNullOrWhiteSpace(note) ? null : note.Trim();
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
