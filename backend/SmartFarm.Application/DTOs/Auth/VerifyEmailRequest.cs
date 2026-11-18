namespace SmartFarm.Application.DTOs.Auth
{
    public class VerifyEmailRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
