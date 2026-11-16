namespace SmartFarm.Application.Common.Configurations
{
    /// <summary>
    /// Cấu hình Google OAuth 2.0 / OpenID Connect từ appsettings.json section "Authentication:Google"
    /// </summary>
    public class GoogleAuthSettings
    {
        public const string SectionName = "Authentication:Google";

        /// <summary>
        /// Google OAuth 2.0 Client ID (dùng để xác thực audience của ID Token)
        /// </summary>
        public string ClientId { get; set; } = string.Empty;
    }
}

