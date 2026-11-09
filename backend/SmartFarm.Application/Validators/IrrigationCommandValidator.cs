using SmartFarm.Application.DTOs.Irrigation;

namespace SmartFarm.Application.Validators
{
    public class IrrigationCommandValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(IrrigationCommandRequest request)
        {
            if (request == null)
                return (false, "Request cannot be null.");

            if (request.DeviceId == Guid.Empty)
                return (false, "DeviceId cannot be empty.");

            if (request.DurationSeconds <= 0 || request.DurationSeconds > 300)
                return (false, "DurationSeconds must be between 1 and 300 seconds (5 minutes max safety limit).");

            return (true, null);
        }
    }
}
