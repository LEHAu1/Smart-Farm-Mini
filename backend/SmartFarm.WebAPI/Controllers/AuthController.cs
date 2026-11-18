using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.WebAPI.Attributes;

namespace SmartFarm.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        }

        /// <summary>
        /// Đăng ký tài khoản người dùng mới với quyền User (yêu cầu xác minh email)
        /// </summary>
        [HttpPost("register")]
        [ProducesResponseType(typeof(RegisterResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
        {
            var result = await _authService.RegisterAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Xác minh email người dùng qua link xác nhận
        /// </summary>
        [HttpPost("verify-email")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken cancellationToken)
        {
            await _authService.VerifyEmailAsync(request, cancellationToken);
            return Ok(new { success = true, message = "Email đã được xác minh thành công." });
        }

        /// <summary>
        /// Gửi lại email xác minh tài khoản (Rate limited: tối đa 3 lần/phút/IP)
        /// </summary>
        [HttpPost("resend-verification")]
        [IpRateLimit(maxRequests: 3, windowSeconds: 60)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken cancellationToken)
        {
            await _authService.ResendVerificationEmailAsync(request, cancellationToken);
            return Ok(new { success = true, message = "Nếu email hợp lệ và chưa xác minh, hướng dẫn xác minh đã được gửi." });
        }

        /// <summary>
        /// Yêu cầu đặt lại mật khẩu (Rate limited: tối đa 3 lần/phút/IP)
        /// </summary>
        [HttpPost("forgot-password")]
        [IpRateLimit(maxRequests: 3, windowSeconds: 60)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
        {
            await _authService.ForgotPasswordAsync(request, cancellationToken);
            return Ok(new { success = true, message = "Nếu email hợp lệ, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu." });
        }

        /// <summary>
        /// Đặt lại mật khẩu mới với token từ email
        /// </summary>
        [HttpPost("reset-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
        {
            await _authService.ResetPasswordAsync(request, cancellationToken);
            return Ok(new { success = true, message = "Mật khẩu đã được đặt lại thành công." });
        }

        /// <summary>
        /// Đăng nhập và nhận JWT Access Token (15 phút) cùng Refresh Token (30 ngày)
        /// </summary>
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
        {
            var result = await _authService.LoginAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Đăng nhập bằng Google ID Token (OAuth 2.0 / OpenID Connect)
        /// </summary>
        [HttpPost("google")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken cancellationToken)
        {
            var result = await _authService.GoogleLoginAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Cấp lại Access Token mới bằng Refresh Token (Token Rotation)
        /// </summary>
        [HttpPost("refresh-token")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
        {
            var result = await _authService.RefreshTokenAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Đăng xuất và thu hồi Refresh Token
        /// </summary>
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
        {
            await _authService.RevokeTokenAsync(request, cancellationToken);
            return NoContent();
        }

        /// <summary>
        /// Lấy thông tin tài khoản hiện tại (Yêu cầu đăng nhập)
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(subClaim, out var userId))
                return Unauthorized();

            var profile = await _authService.GetProfileAsync(userId, cancellationToken);
            return Ok(profile);
        }

        /// <summary>
        /// Cập nhật thông tin cá nhân (DisplayName, PhoneNumber)
        /// </summary>
        [HttpPut("profile")]
        [Authorize]
        [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(subClaim, out var userId))
                return Unauthorized();

            var updated = await _authService.UpdateProfileAsync(userId, request, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// Đổi mật khẩu tài khoản
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(subClaim, out var userId))
                return Unauthorized();

            await _authService.ChangePasswordAsync(userId, request, cancellationToken);
            return NoContent();
        }
    }
}
