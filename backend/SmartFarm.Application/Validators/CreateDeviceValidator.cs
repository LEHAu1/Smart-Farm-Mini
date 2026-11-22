using SmartFarm.Application.DTOs.Device;
using System.Text.RegularExpressions;

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

            if (!Regex.IsMatch(request.DeviceCode, @"\A[A-Za-z0-9_-]{1,50}\z"))
                return (false, "DeviceCode must contain 1 to 50 letters, digits, hyphens, or underscores.");

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
