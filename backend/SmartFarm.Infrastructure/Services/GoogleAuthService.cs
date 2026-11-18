using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using System.Security;

namespace SmartFarm.Infrastructure.Services
{
    /// <summary>
    /// Triển khai xác minh Google ID Token sử dụng thư viện chính thức Google.Apis.Auth
    /// </summary>
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly GoogleAuthSettings _settings;
        private readonly ILogger<GoogleAuthService> _logger;

        public GoogleAuthService(
            IOptions<GoogleAuthSettings> options,
            ILogger<GoogleAuthService> logger)
        {
            _settings = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(idToken))
            {
                throw new ArgumentException("Google ID Token không được để trống.", nameof(idToken));
            }

            try
            {
                var validationSettings = new GoogleJsonWebSignature.ValidationSettings();

                // Nếu ClientId được cấu hình, bắt buộc kiểm tra Audience (hỗ trợ nhiều Client ID phân cách bởi dấu phẩy)
                if (!string.IsNullOrWhiteSpace(_settings.ClientId))
                {
                    var clientIds = _settings.ClientId
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    validationSettings.Audience = clientIds;
                }
                else
                {
                    _logger.LogWarning("Google:ClientId chưa được cấu hình trong appsettings.json. Bỏ qua kiểm tra Audience, chỉ xác minh chữ ký Google PKI.");
                }

                // Xác minh chữ ký số Google Public Keys, Issuer, Expiration
                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);

                if (payload == null)
                {
                    throw new SecurityException("Không thể giải mã Google ID Token.");
                }

                if (string.IsNullOrWhiteSpace(payload.Subject))
                {
                    throw new SecurityException("Google ID Token không chứa thông tin định danh Subject ID.");
                }

                if (string.IsNullOrWhiteSpace(payload.Email))
                {
                    throw new SecurityException("Google ID Token không chứa thông tin Email người dùng.");
                }

                // Yêu cầu bắt buộc: Email phải được Google xác thực
                if (!payload.EmailVerified)
                {
                    throw new UnauthorizedAccessException("Tài khoản Google này chưa được xác minh địa chỉ email (EmailVerified = false).");
                }

                return new GoogleUserInfo
                {
                    SubjectId = payload.Subject,
                    Email = payload.Email.Trim().ToLowerInvariant(),
                    EmailVerified = payload.EmailVerified,
                    Name = payload.Name,
                    Picture = payload.Picture
                };
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogError(ex, "Google ID Token không hợp lệ hoặc đã hết hạn.");
                throw new UnauthorizedAccessException($"Google ID Token không hợp lệ hoặc đã hết hạn: {ex.Message}", ex);
            }
            catch (Exception ex) when (ex is not UnauthorizedAccessException && ex is not SecurityException)
            {
                _logger.LogError(ex, "Lỗi khi xác minh Google ID Token với máy chủ Google.");
                throw new InvalidOperationException($"Lỗi xác thực Google: {ex.Message}", ex);
            }
        }
    }
}

