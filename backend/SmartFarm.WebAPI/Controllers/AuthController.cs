using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using System.Security.Claims;

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
        /// Đăng ký tài khoản người dùng mới với quyền User
        /// </summary>
        [HttpPost("register")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
        {
            var result = await _authService.RegisterAsync(request, cancellationToken);
            return Ok(result);
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
