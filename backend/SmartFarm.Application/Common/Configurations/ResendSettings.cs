namespace SmartFarm.Application.Common.Configurations
{
    public class ResendSettings
    {
        public const string SectionName = "Resend";

        /// <summary>
        /// API Key của Resend (Không commit key thật vào source code)
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Địa chỉ email gửi đi
        /// </summary>
        public string FromEmail { get; set; } = "noreply@smartfarm.local";

        /// <summary>
        /// Tên hiển thị người gửi
        /// </summary>
        public string FromName { get; set; } = "Smart Farm Mini";

        /// <summary>
        /// Địa chỉ frontend base URL để tạo link xác minh và đặt lại mật khẩu
        /// </summary>
        public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    }
}
