namespace SmartFarm.Application.Contracts.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(Guid userId, string userName, string email, string role = "User");
        (string RawToken, string TokenHash) GenerateRefreshToken();
        string HashToken(string rawToken);
    }
}
