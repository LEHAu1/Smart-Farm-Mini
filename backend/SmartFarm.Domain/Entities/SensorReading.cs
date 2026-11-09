using System;
using SmartFarm.Domain.Constants;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Domain.Entities
{
    public class SensorReading
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // Thiết bị gửi dữ liệu
        public Guid DeviceId { get; private set; }

        // Loại cảm biến
        public SensorType SensorType { get; private set; }

        // Mã định danh gói tin MQTT (Idempotency - chống trùng lặp dữ liệu)
        public Guid? MessageId { get; private set; }

        // Giá trị đo được
        public decimal Value { get; private set; }

        // Đơn vị đo: %, °C, cm...
        public string Unit { get; private set; } = string.Empty;

        // Thời điểm cảm biến ghi nhận dữ liệu
        public DateTimeOffset RecordedAtUtc { get; private set; }

        // Thời điểm Backend nhận dữ liệu
        public DateTimeOffset ReceivedAtUtc { get; private set; }

        // Constructor khởi tạo dữ liệu cảm biến
        public SensorReading(
            Guid deviceId,
            SensorType sensorType,
            decimal value,
            string unit,
            DateTimeOffset recordedAtUtc,
            DateTimeOffset receivedAtUtc,
            Guid? messageId = null)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException(
                    "Device ID cannot be empty.", nameof(deviceId));

            if (!Enum.IsDefined(typeof(SensorType), sensorType))
                throw new ArgumentOutOfRangeException(nameof(sensorType));

            if (string.IsNullOrWhiteSpace(unit))
                throw new ArgumentException(
                    "Unit cannot be empty.", nameof(unit));

            ValidateUtc(recordedAtUtc, nameof(recordedAtUtc));
            ValidateUtc(receivedAtUtc, nameof(receivedAtUtc));

            if (receivedAtUtc < recordedAtUtc)
                throw new ArgumentException(
                    "Received time cannot be earlier than recorded time.");

            ValidateSensorValue(sensorType, value);

            Id = Guid.NewGuid();
            DeviceId = deviceId;
            SensorType = sensorType;
            MessageId = messageId;
            Value = value;
            Unit = unit.Trim();
            RecordedAtUtc = recordedAtUtc;
            ReceivedAtUtc = receivedAtUtc;
        }

        // Kiểm tra giá trị cảm biến hợp lệ
        private static void ValidateSensorValue(
            SensorType sensorType,
            decimal value)
        {
            switch (sensorType)
            {
                case SensorType.SoilMoisture:
                    if (value < IrrigationConstants.MinSoilMoisture || value > IrrigationConstants.MaxSoilMoisture)
                        throw new ArgumentOutOfRangeException(
                            nameof(value),
                            $"Soil moisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");
                    break;

                case SensorType.AirHumidity:
                    if (value < 0 || value > 100)
                        throw new ArgumentOutOfRangeException(
                            nameof(value),
                            "Air humidity must be between 0 and 100.");
                    break;

                case SensorType.AirTemperature:
                case SensorType.WaterTemperature:
                    if (value < -50 || value > 100)
                        throw new ArgumentOutOfRangeException(
                            nameof(value),
                            "Temperature value is outside the supported range.");
                    break;

                case SensorType.WaterLevel:
                    if (value < 0)
                        throw new ArgumentOutOfRangeException(
                            nameof(value),
                            "Water level cannot be negative.");
                    break;

                default:
                    throw new ArgumentOutOfRangeException(
                        nameof(sensorType),
                        "Unsupported sensor type.");
            }
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
