using System.Net;
using System.Security;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Exceptions;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SmartFarmDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IGoogleAuthService _googleAuthService;
        private readonly IEmailService _emailService;
        private readonly JwtSettings _jwtSettings;
        private readonly ResendSettings _resendSettings;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            UserManager<AppUser> userManager,
            SmartFarmDbContext context,
            ITokenService tokenService,
            IGoogleAuthService googleAuthService,
            IEmailService emailService,
            IOptions<JwtSettings> jwtOptions,
            IOptions<ResendSettings> resendOptions,
            ILogger<AuthService> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
            _googleAuthService = googleAuthService ?? throw new ArgumentNullException(nameof(googleAuthService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _jwtSettings = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
            _resendSettings = resendOptions?.Value ?? throw new ArgumentNullException(nameof(resendOptions));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<RegisterResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserName))
                throw new ArgumentException("Tên đăng nhập không được để trống.", nameof(request.UserName));

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Email không được để trống.", nameof(request.Email));

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Mật khẩu không được để trống.", nameof(request.Password));

            var existingUser = await _userManager.FindByNameAsync(request.UserName);
            if (existingUser != null)
                throw new InvalidOperationException($"Tên đăng nhập '{request.UserName}' đã được sử dụng.");

            var existingEmail = await _userManager.FindByEmailAsync(request.Email);
            if (existingEmail != null)
                throw new InvalidOperationException($"Email '{request.Email}' đã được đăng ký.");

            // Public registration must never grant administrative privileges.
            const string role = "User";

            var now = DateTimeOffset.UtcNow;
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = request.UserName.Trim(),
                Email = request.Email.Trim(),
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.UserName.Trim() : request.DisplayName.Trim(),
                AuthProvider = "Local",
                CreatedAtUtc = now,
                EmailConfirmed = false
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Đăng ký thất bại: {errors}");
            }

            // Gán Role Claim vào bảng AspNetUserClaims
            await _userManager.AddClaimAsync(user, new Claim(ClaimTypes.Role, role));

            // Generate email confirmation token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var encodedToken = WebUtility.UrlEncode(token);
            var baseUrl = _resendSettings.FrontendBaseUrl.TrimEnd('/');
            var verifyUrl = $"{baseUrl}/verify-email?userId={user.Id}&token={encodedToken}";

            try
            {
                await _emailService.SendEmailVerificationAsync(user.Email, user.DisplayName ?? user.UserName, verifyUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi gửi email xác minh sau khi đăng ký cho user {Email}", user.Email);
            }

            return new RegisterResponseDto
            {
                Message = "Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác minh tài khoản.",
                RequiresEmailVerification = true
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserNameOrEmail))
                throw new ArgumentException("Tài khoản không được để trống.", nameof(request.UserNameOrEmail));

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Mật khẩu không được để trống.", nameof(request.Password));

            var user = await _userManager.FindByNameAsync(request.UserNameOrEmail)
                       ?? await _userManager.FindByEmailAsync(request.UserNameOrEmail);

            if (user is null)
            {
                throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
            }

            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new UnauthorizedAccessException("Tài khoản đã bị tạm khóa do nhiều lần đăng nhập sai. Vui lòng thử lại sau.");
            }

            if (!await _userManager.CheckPasswordAsync(user, request.Password))
            {
                await _userManager.AccessFailedAsync(user);
                throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
            }

            await _userManager.ResetAccessFailedCountAsync(user);

            // Kiểm tra trạng thái xác minh email cho tài khoản Local
            if (!user.EmailConfirmed && (user.AuthProvider == "Local" || string.IsNullOrEmpty(user.AuthProvider)))
            {
                throw new EmailNotVerifiedException("Email chưa được xác minh. Vui lòng kiểm tra hộp thư.");
            }

            var claims = await _userManager.GetClaimsAsync(user);
            var role = claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "User";

            var now = DateTimeOffset.UtcNow;
            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.UserName!, user.Email!, role);
            var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
            var tokenFamily = Guid.NewGuid();

            var refreshTokenEntity = new RefreshToken(
                user.Id,
                tokenHash,
                tokenFamily,
                now.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                now);

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync(cancellationToken);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken,
                ExpiresAtUtc = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
                User = MapToUserDto(user, role)
            };
        }

        public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.IdToken))
            {
                throw new ArgumentException("Google ID Token không được để trống.", nameof(request.IdToken));
            }

            // 1. Xác minh Google ID Token qua Google Auth Service
            var googleUser = await _googleAuthService.VerifyIdTokenAsync(request.IdToken, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            AppUser? user = null;

            // 2. Tìm tài khoản theo Google Subject ID
            if (!string.IsNullOrWhiteSpace(googleUser.SubjectId))
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == googleUser.SubjectId, cancellationToken);
            }

            // 3. Nếu chưa tìm thấy theo GoogleSubjectId, tìm theo Email để liên kết tài khoản
            if (user == null && !string.IsNullOrWhiteSpace(googleUser.Email))
            {
                user = await _userManager.FindByEmailAsync(googleUser.Email);

                if (user != null)
                {
                    // Tài khoản đã đăng ký trước đó bằng Email/Password -> Liên kết tài khoản với Google
                    user.GoogleSubjectId = googleUser.SubjectId;
                    user.AvatarUrl ??= googleUser.Picture;
                    if (!user.EmailConfirmed)
                    {
                        user.EmailConfirmed = true;
                    }

                    await _userManager.UpdateAsync(user);

                    // Thêm thông tin login provider vào AspNetUserLogins
                    var logins = await _userManager.GetLoginsAsync(user);
                    if (!logins.Any(l => l.LoginProvider == "Google" && l.ProviderKey == googleUser.SubjectId))
                    {
                        await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", googleUser.SubjectId, "Google"));
                    }
                }
            }

            // 4. Nếu tài khoản chưa tồn tại trong hệ thống -> Đăng ký người dùng mới
            if (user == null)
            {
                var baseUserName = googleUser.Email.Split('@')[0].Replace(".", "_").Replace("-", "_");
                var uniqueUserName = baseUserName;
                var suffix = 1;

                while (await _userManager.FindByNameAsync(uniqueUserName) != null)
                {
                    uniqueUserName = $"{baseUserName}_{suffix++}";
                }

                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = uniqueUserName,
                    Email = googleUser.Email,
                    DisplayName = string.IsNullOrWhiteSpace(googleUser.Name) ? uniqueUserName : googleUser.Name.Trim(),
                    GoogleSubjectId = googleUser.SubjectId,
                    AuthProvider = "Google",
                    AvatarUrl = googleUser.Picture,
                    EmailConfirmed = true,
                    CreatedAtUtc = now
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Tạo tài khoản Google thất bại: {errors}");
                }

                // QUY TẮC BẢO MẬT: Mặc định gán Role "User", TUYỆT ĐỐI không tự ý cấp quyền "Admin"
                await _userManager.AddClaimAsync(user, new Claim(ClaimTypes.Role, "User"));

                // Ghi nhận vào bảng AspNetUserLogins chuẩn Identity
                await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", googleUser.SubjectId, "Google"));
            }

            // 5. Kiểm tra trạng thái khóa tài khoản
            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new UnauthorizedAccessException("Tài khoản đã bị tạm khóa do vi phạm chính sách bảo mật hoặc bị vô hiệu hóa bởi quản trị viên.");
            }

            // 6. Lấy Role hiện tại của tài khoản (giữ nguyên quyền Admin nếu tài khoản đã được cấp trước đó)
            var claims = await _userManager.GetClaimsAsync(user);
            var role = claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "User";

            // 7. Tạo JWT Access Token & Refresh Token của Smart Farm Mini
            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.UserName!, user.Email!, role);
            var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
            var tokenFamily = Guid.NewGuid();

            var refreshTokenEntity = new RefreshToken(
                user.Id,
                tokenHash,
                tokenFamily,
                now.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                now);

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync(cancellationToken);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken,
                ExpiresAtUtc = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
                User = MapToUserDto(user, role)
            };
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.RefreshToken))
                throw new ArgumentException("Refresh token không được để trống.", nameof(request.RefreshToken));

            var tokenHash = _tokenService.HashToken(request.RefreshToken);
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

            if (storedToken == null)
            {
                throw new SecurityException("Refresh token không tồn tại.");
            }

            var now = DateTimeOffset.UtcNow;

            // Reuse detection
            if (storedToken.IsRevoked)
            {
                var familyTokens = await _context.RefreshTokens
                    .Where(t => t.TokenFamily == storedToken.TokenFamily && t.RevokedAtUtc == null)
                    .ToListAsync(cancellationToken);

                foreach (var token in familyTokens)
                {
                    token.Revoke(now, "REUSE_DETECTED");
                }

                await _context.SaveChangesAsync(cancellationToken);

                throw new SecurityException("Cảnh báo an ninh: Phát hiện hành vi tái sử dụng Refresh Token! Toàn bộ phiên đăng nhập liên quan đã bị thu hồi ngay lập tức.");
            }

            if (storedToken.IsExpired)
            {
                throw new SecurityException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
            }

            var user = await _userManager.FindByIdAsync(storedToken.UserId.ToString());
            if (user == null)
            {
                throw new UnauthorizedAccessException("Người dùng không còn tồn tại trong hệ thống.");
            }

            var claims = await _userManager.GetClaimsAsync(user);
            var role = claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "User";

            // Rotation
            var (newRawRefreshToken, newTokenHash) = _tokenService.GenerateRefreshToken();
            storedToken.Revoke(now, "ROTATED", newTokenHash);

            var newRefreshTokenEntity = new RefreshToken(
                storedToken.UserId,
                newTokenHash,
                storedToken.TokenFamily,
                now.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                now);

            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync(cancellationToken);

            var newAccessToken = _tokenService.GenerateAccessToken(user.Id, user.UserName!, user.Email!, role);

            return new AuthResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRawRefreshToken,
                ExpiresAtUtc = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
                User = MapToUserDto(user, role)
            };
        }

        public async Task RevokeTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.RefreshToken))
                return;

            var tokenHash = _tokenService.HashToken(request.RefreshToken);
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

            if (storedToken != null && !storedToken.IsRevoked)
            {
                storedToken.Revoke(DateTimeOffset.UtcNow, "LOGOUT");
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                throw new KeyNotFoundException($"Không tìm thấy người dùng với ID '{userId}'.");

            var claims = await _userManager.GetClaimsAsync(user);
            var role = claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "User";

            return new UserProfileDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                PhoneNumber = user.PhoneNumber,
                Role = role,
                AuthProvider = user.AuthProvider ?? "Local",
                AvatarUrl = user.AvatarUrl,
                CreatedAtUtc = user.CreatedAtUtc
            };
        }

        public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                throw new KeyNotFoundException($"Không tìm thấy người dùng với ID '{userId}'.");

            if (!string.IsNullOrWhiteSpace(request.DisplayName))
            {
                user.DisplayName = request.DisplayName.Trim();
            }

            if (request.PhoneNumber != null)
            {
                user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
            }

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                var errors = string.Join("; ", updateResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Cập nhật thông tin thất bại: {errors}");
            }

            var claims = await _userManager.GetClaimsAsync(user);
            var role = claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value ?? "User";

            return new UserProfileDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                PhoneNumber = user.PhoneNumber,
                Role = role,
                AuthProvider = user.AuthProvider ?? "Local",
                AvatarUrl = user.AvatarUrl,
                CreatedAtUtc = user.CreatedAtUtc
            };
        }

        public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                throw new ArgumentException("Mật khẩu hiện tại không được để trống.", nameof(request.CurrentPassword));

            if (string.IsNullOrWhiteSpace(request.NewPassword))
                throw new ArgumentException("Mật khẩu mới không được để trống.", nameof(request.NewPassword));

            if (request.NewPassword.Length < 8)
                throw new ArgumentException("Mật khẩu mới phải có ít nhất 8 ký tự.", nameof(request.NewPassword));

            if (request.NewPassword != request.ConfirmNewPassword)
                throw new ArgumentException("Mật khẩu xác nhận không khớp.", nameof(request.ConfirmNewPassword));

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                throw new KeyNotFoundException($"Không tìm thấy người dùng với ID '{userId}'.");

            var changeResult = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!changeResult.Succeeded)
            {
                var errors = string.Join("; ", changeResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Đổi mật khẩu thất bại: {errors}");
            }
        }

        public async Task VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Token))
                throw new ArgumentException("Mã người dùng hoặc mã xác minh không hợp lệ.");

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy thông tin tài khoản.");
            }

            if (user.EmailConfirmed)
            {
                return; // Đã xác minh trước đó
            }

            var decodedToken = WebUtility.UrlDecode(request.Token);
            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Xác minh email thất bại hoặc mã xác nhận đã hết hạn: {errors}");
            }
        }

        public async Task ResendVerificationEmailAsync(ResendVerificationRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Email không được để trống.", nameof(request.Email));

            var user = await _userManager.FindByEmailAsync(request.Email.Trim());
            // Chống dò email: nếu không tồn tại hoặc đã xác minh, kết thúc an toàn không throw lỗi
            if (user == null || user.EmailConfirmed)
            {
                return;
            }

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var encodedToken = WebUtility.UrlEncode(token);
            var baseUrl = _resendSettings.FrontendBaseUrl.TrimEnd('/');
            var verifyUrl = $"{baseUrl}/verify-email?userId={user.Id}&token={encodedToken}";

            try
            {
                await _emailService.SendEmailVerificationAsync(user.Email!, user.DisplayName ?? user.UserName!, verifyUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi gửi lại email xác minh tới {Email}", user.Email);
            }
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return;
            }

            var user = await _userManager.FindByEmailAsync(request.Email.Trim());
            // Chống dò email: nếu không tồn tại hoặc email chưa xác minh, return generic
            if (user == null || !user.EmailConfirmed)
            {
                return;
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebUtility.UrlEncode(token);
            var baseUrl = _resendSettings.FrontendBaseUrl.TrimEnd('/');
            var resetUrl = $"{baseUrl}/reset-password?email={WebUtility.UrlEncode(user.Email!)}&token={encodedToken}";

            try
            {
                await _emailService.SendPasswordResetAsync(user.Email!, user.DisplayName ?? user.UserName!, resetUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi gửi email đặt lại mật khẩu tới {Email}", user.Email);
            }
        }

        public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Email không được để trống.", nameof(request.Email));

            if (string.IsNullOrWhiteSpace(request.Token))
                throw new ArgumentException("Mã xác thực không được để trống.", nameof(request.Token));

            if (string.IsNullOrWhiteSpace(request.NewPassword))
                throw new ArgumentException("Mật khẩu mới không được để trống.", nameof(request.NewPassword));

            if (request.NewPassword != request.ConfirmPassword)
                throw new ArgumentException("Mật khẩu xác nhận không khớp.", nameof(request.ConfirmPassword));

            if (request.NewPassword.Length < 8)
                throw new ArgumentException("Mật khẩu mới phải có ít nhất 8 ký tự.", nameof(request.NewPassword));

            var user = await _userManager.FindByEmailAsync(request.Email.Trim());
            if (user == null)
            {
                throw new InvalidOperationException("Yêu cầu đặt lại mật khẩu không hợp lệ.");
            }

            var decodedToken = WebUtility.UrlDecode(request.Token);
            var result = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Đặt lại mật khẩu thất bại: {errors}");
            }

            // Thu hồi tất cả Refresh Token đang active của user
            var now = DateTimeOffset.UtcNow;
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAtUtc == null && t.ExpiresAtUtc > now)
                .ToListAsync(cancellationToken);

            foreach (var token in activeTokens)
            {
                token.Revoke(now, "PASSWORD_RESET");
            }
            await _context.SaveChangesAsync(cancellationToken);

            // Cập nhật SecurityStamp để vô hiệu hóa phiên cũ
            await _userManager.UpdateSecurityStampAsync(user);
        }

        private static UserDto MapToUserDto(AppUser user, string role)
        {
            return new UserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                Role = role,
                AuthProvider = user.AuthProvider ?? "Local",
                AvatarUrl = user.AvatarUrl,
                CreatedAtUtc = user.CreatedAtUtc
            };
        }
    }
}
