namespace SmartFarm.Application.Common.Configurations
{
    /// <summary>
    /// Cấu hình JWT từ appsettings.json section "JwtSettings".
    /// </summary>
    public class JwtSettings
    {
        public const string SectionName = "JwtSettings";

        /// <summary>
        /// Secret key để ký JWT — phải >= 32 ký tự (256 bit).
        /// </summary>
        public string SecretKey { get; set; } = string.Empty;

        /// <summary>
        /// Issuer — thường là URL của backend API.
        /// </summary>
        public string Issuer { get; set; } = string.Empty;

        /// <summary>
        /// Audience — thường là URL của frontend.
        /// </summary>
        public string Audience { get; set; } = string.Empty;

        /// <summary>
        /// Thời gian sống Access Token (phút). Mặc định: 15 phút.
        /// </summary>
        public int AccessTokenExpiryMinutes { get; set; } = 15;

        /// <summary>
        /// Thời gian sống Refresh Token (ngày). Mặc định: 30 ngày.
        /// </summary>
        public int RefreshTokenExpiryDays { get; set; } = 30;
    }
}

