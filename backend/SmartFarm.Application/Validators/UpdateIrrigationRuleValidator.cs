using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Domain.Constants;

namespace SmartFarm.Application.Validators
{
    public class UpdateIrrigationRuleValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(UpdateIrrigationRuleRequest request)
        {
            if (request == null)
                return (false, "Request cannot be null.");

            if (string.IsNullOrWhiteSpace(request.Name))
                return (false, "Rule name is required.");

            if (request.Name.Length > 100)
                return (false, "Rule name cannot exceed 100 characters.");

            if (request.MoistureThreshold < IrrigationConstants.MinSoilMoisture || request.MoistureThreshold > IrrigationConstants.MaxSoilMoisture)
                return (false, $"MoistureThreshold must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (request.TargetMoisture < IrrigationConstants.MinSoilMoisture || request.TargetMoisture > IrrigationConstants.MaxSoilMoisture)
                return (false, $"TargetMoisture must be between {IrrigationConstants.MinSoilMoisture} and {IrrigationConstants.MaxSoilMoisture}.");

            if (request.TargetMoisture <= request.MoistureThreshold)
                return (false, "TargetMoisture must be strictly greater than MoistureThreshold.");

            if (request.MinIntervalMinutes < 0)
                return (false, "MinIntervalMinutes cannot be negative.");

            if (request.MaxDurationSeconds <= 0 || request.MaxDurationSeconds > 300)
                return (false, "MaxDurationSeconds must be between 1 and 300 seconds.");

            return (true, null);
        }
    }
}
