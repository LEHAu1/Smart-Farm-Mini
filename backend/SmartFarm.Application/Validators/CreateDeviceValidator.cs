using SmartFarm.Application.DTOs.Device;

namespace SmartFarm.Application.Validators
{
    public class CreateDeviceValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateDeviceRequest request)
        {
            if (request == null)
                return (false, "Request cannot be null.");

            if (request.OwnerId == Guid.Empty)
                return (false, "OwnerId cannot be empty.");

            if (string.IsNullOrWhiteSpace(request.DeviceCode))
                return (false, "DeviceCode is required.");

            if (request.DeviceCode.Length > 50)
                return (false, "DeviceCode cannot exceed 50 characters.");

            if (string.IsNullOrWhiteSpace(request.Name))
                return (false, "Device Name is required.");

            if (request.Name.Length > 100)
                return (false, "Device Name cannot exceed 100 characters.");

            if (!string.IsNullOrWhiteSpace(request.Description) && request.Description.Length > 500)
                return (false, "Description cannot exceed 500 characters.");

            return (true, null);
        }
    }
}
