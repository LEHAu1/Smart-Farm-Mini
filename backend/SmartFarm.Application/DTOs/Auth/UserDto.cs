namespace SmartFarm.Application.DTOs.Auth
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string Role { get; set; } = "User";
        public string? AuthProvider { get; set; } = "Local";
        public string? AvatarUrl { get; set; }
        public DateTimeOffset CreatedAtUtc { get; set; }
    }
}
