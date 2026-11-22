using Microsoft.AspNetCore.Identity;
using SmartFarm.Domain.Entities;
using System;
using System.Collections.Generic;

namespace SmartFarm.Infrastructure.Identity
{
    /// <summary>
    /// User entity mở rộng từ IdentityUser&lt;Guid&gt;.
    /// Hỗ trợ đăng nhập truyền thống (Email/Password) và Google OAuth 2.0 (GoogleSubjectId).
    /// </summary>
    public class AppUser : IdentityUser<Guid>
    {
        /// <summary>
        /// Tên hiển thị trên dashboard.
        /// </summary>
        public string? DisplayName { get; set; }

        /// <summary>
        /// Google Subject ID (sub claim trong Google ID Token).
        /// Dùng làm định danh duy nhất cho tài khoản đăng nhập bằng Google.
        /// </summary>
        public string? GoogleSubjectId { get; set; }

        /// <summary>
        /// Nhà cung cấp xác thực ("Local", "Google").
        /// </summary>
        public string? AuthProvider { get; set; } = "Local";

        /// <summary>
        /// Đường dẫn ảnh đại diện (avatar) từ Google Profile.
        /// </summary>
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// Thời điểm tạo tài khoản (UTC).
        /// </summary>
        public DateTimeOffset CreatedAtUtc { get; set; }

        // Navigation properties
        public ICollection<Device> Devices { get; set; } = new List<Device>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
