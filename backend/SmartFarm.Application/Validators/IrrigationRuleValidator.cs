using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Domain.Constants;

namespace SmartFarm.Application.Validators
{
    /// <summary>
    /// Bộ kiểm tra hợp lệ dữ liệu cho quy tắc tưới tự động (Tạo mới &amp; Cập nhật)
    /// </summary>
    public static class IrrigationRuleValidator
    {
        public static (bool IsValid, string? ErrorMessage) ValidateCreate(CreateIrrigationRuleRequest request)
        {
            if (request == null)
                return (false, "Request cannot be null.");

            if (request.DeviceId == Guid.Empty)
                return (false, "DeviceId cannot be empty.");

            return ValidateSettings(
                request.Name,
                request.MoistureThreshold,
                request.TargetMoisture,
                request.MinIntervalMinutes,
                request.MaxDurationSeconds);
        }

        public static (bool IsValid, string? ErrorMessage) ValidateUpdate(UpdateIrrigationRuleRequest request)
        {
            if (request == null)
                return (false, "Request cannot be null.");

            return ValidateSettings(
                request.Name,
                request.MoistureThreshold,
                request.TargetMoisture,
                request.MinIntervalMinutes,
                request.MaxDurationSeconds);
        }

        private static (bool IsValid, string? ErrorMessage) ValidateSettings(
            string name,
            decimal moistureThreshold,
            decimal targetMoisture,
            int minIntervalMinutes,
            int maxDurationSeconds)
        {
            if (string.IsNullOrWhiteSpace(name))
                return (false, "Rule name is required.");

            if (name.Length > 100)
                return (false, "Rule name cannot exceed 100 characters.");

            if (moistureThreshold < IrrigationConstants.MinSoilMoisture || moistureThreshold > IrrigationConstants.MaxSoilMoisture)
                return (false, $"MoistureThreshold must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (targetMoisture < IrrigationConstants.MinSoilMoisture || targetMoisture > IrrigationConstants.MaxSoilMoisture)
                return (false, $"TargetMoisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (targetMoisture <= moistureThreshold)
                return (false, "TargetMoisture must be strictly greater than MoistureThreshold.");

            if (minIntervalMinutes < 0)
                return (false, "MinIntervalMinutes cannot be negative.");

            if (maxDurationSeconds <= 0 || maxDurationSeconds > 300)
                return (false, "MaxDurationSeconds must be between 1 and 300 seconds.");

            return (true, null);
        }
    }
}

