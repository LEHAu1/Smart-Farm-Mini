using SmartFarm.Application.DTOs.Auth;

namespace SmartFarm.Application.Contracts.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
        Task RevokeTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    }
}

