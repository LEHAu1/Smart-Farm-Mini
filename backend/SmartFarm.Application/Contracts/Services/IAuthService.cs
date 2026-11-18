using SmartFarm.Application.DTOs.Auth;

namespace SmartFarm.Application.Contracts.Services
{
    public interface IAuthService
    {
        Task<RegisterResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
        Task RevokeTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
        Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
        Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
        Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);

        Task VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);
        Task ResendVerificationEmailAsync(ResendVerificationRequest request, CancellationToken cancellationToken = default);
        Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
        Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
    }
}
