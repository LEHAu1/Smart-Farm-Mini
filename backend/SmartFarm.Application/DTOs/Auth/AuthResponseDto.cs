namespace SmartFarm.Application.DTOs.Auth
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTimeOffset ExpiresAtUtc { get; set; }
        public UserDto User { get; set; } = null!;
    }
}

