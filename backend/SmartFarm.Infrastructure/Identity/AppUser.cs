using Microsoft.AspNetCore.Identity;
using SmartFarm.Domain.Entities;
using System;
using System.Collections.Generic;

namespace SmartFarm.Infrastructure.Identity
{
    /// <summary>
    /// User entity mở rộng từ IdentityUser&lt;Guid&gt;.
    /// Thêm DisplayName và CreatedAtUtc theo thiết kế Database.
    /// Single User model — không dùng Roles.
    /// </summary>
    public class AppUser : IdentityUser<Guid>
    {
        /// <summary>
        /// Tên hiển thị trên dashboard.
        /// </summary>
        public string? DisplayName { get; set; }

        /// <summary>
        /// Thời điểm tạo tài khoản (UTC).
        /// </summary>
        public DateTimeOffset CreatedAtUtc { get; set; }

        // Navigation properties
        public ICollection<Device> Devices { get; set; } = new List<Device>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}

