using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using System.Security.Claims;

namespace SmartFarm.WebAPI.Extensions
{
    /// <summary>
    /// Helper dùng chung cho các Controller kiểm tra thông tin người dùng và quyền sở hữu thiết bị
    /// </summary>
    internal static class ControllerDeviceAuthorizationExtensions
    {
        public static (Guid UserId, bool IsAdmin) GetCurrentUserContext(this ClaimsPrincipal user)
        {
            var subClaim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid.TryParse(subClaim, out var userId);

            var role = user.FindFirstValue(ClaimTypes.Role);
            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

            return (userId, isAdmin);
        }

        public static async Task<ActionResult?> EnsureDeviceAccessAsync(
            this ControllerBase controller,
            IDeviceService deviceService,
            Guid deviceId,
            CancellationToken cancellationToken)
        {
            var device = await deviceService.GetByIdAsync(deviceId, cancellationToken);
            if (device is null)
            {
                return controller.NotFound(new { message = $"Không tìm thấy thiết bị với ID '{deviceId}'." });
            }

            var (userId, isAdmin) = controller.User.GetCurrentUserContext();
            if (!isAdmin && device.OwnerId != userId)
            {
                return controller.StatusCode(
                    StatusCodes.Status403Forbidden,
                    new { message = "Bạn không có quyền truy cập thiết bị này." });
            }

            return null;
        }
    }
}

