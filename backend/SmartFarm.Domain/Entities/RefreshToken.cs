using System;

namespace SmartFarm.Domain.Entities
{
    /// <summary>
    /// JWT Refresh Token với hỗ trợ hash, rotation, revocation và token family.
    /// Token family cho phép phát hiện reuse attack.
    /// </summary>
    public class RefreshToken
    {
        // Khóa chính
        public Guid Id { get; private set; }

        // ID người dùng sở hữu token
        public Guid UserId { get; private set; }

        // SHA-256 hash của raw token (Base64Url, 88 ký tự)
        // KHÔNG bao giờ lưu raw token
        public string TokenHash { get; private set; } = string.Empty;

        // ID gia đình token — dùng để phát hiện reuse attack.
        // Mỗi lần rotation tạo token mới trong cùng family.
        // Nếu token đã revoked trong family bị dùng lại → revoke toàn bộ family.
        public Guid TokenFamily { get; private set; }

        // Thời điểm hết hạn (UTC, CreatedAtUtc + 30 ngày)
        public DateTimeOffset ExpiresAtUtc { get; private set; }

        // Thời điểm tạo token (UTC)
        public DateTimeOffset CreatedAtUtc { get; private set; }

        // Thời điểm thu hồi — null nếu chưa thu hồi
        public DateTimeOffset? RevokedAtUtc { get; private set; }

        // Hash của token thay thế sau rotation
        public string? ReplacedByTokenHash { get; private set; }

        // Lý do thu hồi: 'ROTATED', 'LOGOUT', 'REUSE_DETECTED', 'EXPIRED_CLEANUP'
        public string? RevokeReason { get; private set; }

        // Computed properties (không lưu DB)
        public bool IsRevoked => RevokedAtUtc.HasValue;
        public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;
        public bool IsActive => !IsRevoked && !IsExpired;

        /// <summary>
        /// Tạo Refresh Token mới (lần đăng nhập đầu tiên hoặc tạo family mới).
        /// </summary>
        public RefreshToken(
            Guid userId,
            string tokenHash,
            Guid tokenFamily,
            DateTimeOffset expiresAtUtc,
            DateTimeOffset createdAtUtc)
        {
            if (userId == Guid.Empty)
                throw new ArgumentException("User ID cannot be empty.", nameof(userId));

            if (string.IsNullOrWhiteSpace(tokenHash))
                throw new ArgumentException("Token hash cannot be empty.", nameof(tokenHash));

            if (tokenFamily == Guid.Empty)
                throw new ArgumentException("Token family cannot be empty.", nameof(tokenFamily));

            ValidateUtc(expiresAtUtc, nameof(expiresAtUtc));
            ValidateUtc(createdAtUtc, nameof(createdAtUtc));

            if (expiresAtUtc <= createdAtUtc)
                throw new ArgumentException("Expiry time must be after creation time.");

            Id = Guid.NewGuid();
            UserId = userId;
            TokenHash = tokenHash;
            TokenFamily = tokenFamily;
            ExpiresAtUtc = expiresAtUtc;
            CreatedAtUtc = createdAtUtc;
        }

        // Constructor rỗng cho EF Core
        private RefreshToken() { }

        /// <summary>
        /// Thu hồi token (logout, rotation, hoặc reuse detected).
        /// </summary>
        public void Revoke(DateTimeOffset revokedAtUtc, string reason, string? replacedByTokenHash = null)
        {
            if (IsRevoked)
                throw new InvalidOperationException("Token has already been revoked.");

            ValidateUtc(revokedAtUtc, nameof(revokedAtUtc));

            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Revoke reason cannot be empty.", nameof(reason));

            RevokedAtUtc = revokedAtUtc;
            RevokeReason = reason.Trim().ToUpperInvariant();
            ReplacedByTokenHash = replacedByTokenHash;
        }

        private static void ValidateUtc(DateTimeOffset value, string parameterName)
        {
            if (value.Offset != TimeSpan.Zero)
                throw new ArgumentException(
                    "Timestamp must use UTC offset (+00:00).", parameterName);
        }
    }
}

