using System.ComponentModel.DataAnnotations;

namespace SmartFarm.Application.DTOs.Auth
{
    /// <summary>
    /// Request đăng nhập bằng Google ID Token (Google Identity Services)
    /// </summary>
    public class GoogleLoginRequest
    {
        [Required(ErrorMessage = "Google ID Token không được để trống.")]
        public string IdToken { get; set; } = string.Empty;
    }
}

