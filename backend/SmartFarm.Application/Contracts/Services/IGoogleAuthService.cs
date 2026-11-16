using SmartFarm.Application.DTOs.Auth;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Service xác minh Google ID Token dựa trên OpenID Connect & Google Public Keys
    /// </summary>
    public interface IGoogleAuthService
    {
        /// <summary>
        /// Xác minh chữ ký số, ClientId, Expiration và EmailVerified của Google ID Token
        /// </summary>
        Task<GoogleUserInfo> VerifyIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
    }
}

