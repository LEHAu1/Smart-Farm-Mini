using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using System.Security;
using System.Security.Claims;

namespace SmartFarm.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SmartFarmDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly JwtSettings _jwtSettings;

        public AuthService(
            UserManager<AppUser> userManager,
            SmartFarmDbContext context,
            ITokenService tokenService,
            IOptions<JwtSettings> jwtOptions)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
            _jwtSettings = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
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

            // Chuẩn hóa Role (mặc định là User, cho phép Admin)
            var role = string.Equals(request.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User";

            var now = DateTimeOffset.UtcNow;
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = request.UserName.Trim(),
                Email = request.Email.Trim(),
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.UserName.Trim() : request.DisplayName.Trim(),
                CreatedAtUtc = now,
                EmailConfirmed = true
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Đăng ký thất bại: {errors}");
            }

            // Gán Role Claim vào bảng AspNetUserClaims
            await _userManager.AddClaimAsync(user, new Claim(ClaimTypes.Role, role));

            // Tạo access token & refresh token mới
            var accessToken = _tokenService.GenerateAccessToken(user.Id, user.UserName, user.Email, role);
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

            if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            {
                throw new UnauthorizedAccessException("Tài khoản hoặc mật khẩu không chính xác.");
            }

            if (await _userManager.IsLockedOutAsync(user))
            {
                throw new UnauthorizedAccessException("Tài khoản đã bị tạm khóa do nhiều lần đăng nhập sai. Vui lòng thử lại sau.");
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

        private static UserDto MapToUserDto(AppUser user, string role)
        {
            return new UserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                Role = role,
                CreatedAtUtc = user.CreatedAtUtc
            };
        }
    }
}
