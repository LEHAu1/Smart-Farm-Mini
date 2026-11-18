namespace SmartFarm.Application.DTOs.Auth
{
    public class RegisterResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public bool RequiresEmailVerification { get; set; } = true;
    }
}
