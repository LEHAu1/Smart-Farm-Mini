namespace SmartFarm.Application.DTOs.Auth
{
    public class UserProfileDto
    {
        public Guid Id { get; init; }
        public string UserName { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string? DisplayName { get; init; }
        public string? PhoneNumber { get; init; }
        public string Role { get; init; } = "User";
        public DateTimeOffset CreatedAtUtc { get; init; }
    }

    public class UpdateProfileRequest
    {
        public string? DisplayName { get; set; }
        public string? PhoneNumber { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}

