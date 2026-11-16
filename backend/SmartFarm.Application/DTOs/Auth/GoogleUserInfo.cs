namespace SmartFarm.Application.DTOs.Auth
{
    /// <summary>
    /// Thông tin người dùng đã được xác thực an toàn từ chữ ký số của Google ID Token
    /// </summary>
    public class GoogleUserInfo
    {
        /// <summary>
        /// Google Subject ID (sub claim) - Định danh người dùng duy nhất trên Google
        /// </summary>
        public string SubjectId { get; set; } = string.Empty;

        /// <summary>
        /// Địa chỉ email người dùng
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Trạng thái email đã được Google xác thực hay chưa
        /// </summary>
        public bool EmailVerified { get; set; }

        /// <summary>
        /// Họ và tên hiển thị
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// Ảnh đại diện (avatar) từ Google Profile
        /// </summary>
        public string? Picture { get; set; }
    }
}

