namespace SmartFarm.Application.DTOs.Auth
{
    public class RegisterRequest
    {
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        /// <summary>
        /// Vai trò người dùng: "Admin" hoặc "User" (Mặc định: "User")
        /// </summary>
        public string Role { get; set; } = "User";
    }
}
