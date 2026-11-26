
using System;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    public class DeviceCommand
    {
        public Guid Id { get; private set; }

        // Thiết bị nhận lệnh
        public Guid DeviceId { get; private set; }

        // Mã lệnh duy nhất
        public string CommandCode { get; private set; } = string.Empty;

        // Loại lệnh: PUMP_ON, PUMP_OFF, EMERGENCY_STOP
        public string Action { get; private set; } = string.Empty;

        // Nội dung bổ sung nếu cần
        public string? Payload { get; private set; }

        // Trạng thái thực hiện lệnh
        public CommandStatus Status { get; private set; }

        // Thời điểm tạo lệnh
        public DateTimeOffset CreatedAtUtc { get; private set; }

        // Hạn cuối để dispatcher gửi lệnh. Quá hạn thì lệnh không được replay.
        public DateTimeOffset ExpiresAtUtc { get; private set; }

        // Lease phân phối bền vững giữa nhiều instance Web API.
        public Guid? DispatchLeaseOwnerId { get; private set; }
        public DateTimeOffset? DispatchLeaseUntilUtc { get; private set; }
        public int DispatchAttemptCount { get; private set; }

        // Thời điểm thiết bị nhận lệnh
        public DateTimeOffset? AcknowledgedAtUtc { get; private set; }

        // Thời điểm hoàn thành lệnh
        public DateTimeOffset? CompletedAtUtc { get; private set; }

        // Thông báo lỗi nếu lệnh thất bại
        public string? ErrorMessage { get; private set; }

        public DeviceCommand(
            Guid deviceId,
            string commandCode,
            string action,
            DateTimeOffset createdAtUtc,
            string? payload = null,
            DateTimeOffset expiresAtUtc = default)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            if (string.IsNullOrWhiteSpace(commandCode))
                throw new ArgumentException(
                    "Command code cannot be empty.", nameof(commandCode));

            if (string.IsNullOrWhiteSpace(action))
                throw new ArgumentException(
                    "Command action cannot be empty.", nameof(action));

            ValidateUtc(createdAtUtc, nameof(createdAtUtc));
            var expiry = expiresAtUtc == default
                ? createdAtUtc.AddMinutes(10)
                : expiresAtUtc;
            ValidateUtc(expiry, nameof(expiresAtUtc));
            if (expiry <= createdAtUtc)
                throw new ArgumentException("Expiry must be later than creation time.", nameof(expiresAtUtc));

            Id = Guid.NewGuid();
            DeviceId = deviceId;
            CommandCode = commandCode.Trim().ToUpperInvariant();
            Action = action.Trim().ToUpperInvariant();
            Payload = NormalizePayload(payload);

            Status = CommandStatus.Pending;
            CreatedAtUtc = createdAtUtc;
            ExpiresAtUtc = expiry;
        }

        // ESP32 xác nhận đã nhận lệnh
        public void Acknowledge(DateTimeOffset acknowledgedAtUtc)
        {
            ValidateUtc(acknowledgedAtUtc, nameof(acknowledgedAtUtc));
            ValidateTimestamp(acknowledgedAtUtc);

            if (Status != CommandStatus.Pending)
                throw new InvalidOperationException(
                    "Only pending commands can be acknowledged.");

            Status = CommandStatus.Acknowledged;
            AcknowledgedAtUtc = acknowledgedAtUtc;
            ClearDispatchLease();
        }

        // Lệnh thực hiện thành công
        public void Complete(DateTimeOffset completedAtUtc)
        {
            ValidateUtc(completedAtUtc, nameof(completedAtUtc));
            ValidateTimestamp(completedAtUtc);

            if (Status != CommandStatus.Acknowledged)
                throw new InvalidOperationException(
                    "Only acknowledged commands can be completed.");

            Status = CommandStatus.Completed;
            CompletedAtUtc = completedAtUtc;
            ClearDispatchLease();
        }

        // Lệnh thực hiện thất bại
        public void Fail(
            string errorMessage,
            DateTimeOffset failedAtUtc)
        {
            if (string.IsNullOrWhiteSpace(errorMessage))
                throw new ArgumentException(
                    "Error message cannot be empty.", nameof(errorMessage));

            ValidateUtc(failedAtUtc, nameof(failedAtUtc));
            ValidateTimestamp(failedAtUtc);

            if (Status == CommandStatus.Completed ||
                Status == CommandStatus.Failed)
            {
                throw new InvalidOperationException(
                    "Completed or failed commands cannot be failed again.");
            }

            Status = CommandStatus.Failed;
            ErrorMessage = errorMessage.Trim();
            CompletedAtUtc = failedAtUtc;
            ClearDispatchLease();
        }

        private void ClearDispatchLease()
        {
            DispatchLeaseOwnerId = null;
            DispatchLeaseUntilUtc = null;
        }

        private void ValidateTimestamp(DateTimeOffset value)
        {
            if (value < CreatedAtUtc ||
                (AcknowledgedAtUtc.HasValue &&
                 value < AcknowledgedAtUtc.Value))
            {
                throw new ArgumentException(
                    "Command timestamp cannot go backwards.");
            }
        }

        private static string? NormalizePayload(string? payload)
        {
            return string.IsNullOrWhiteSpace(payload)
                ? null
                : payload.Trim();
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
