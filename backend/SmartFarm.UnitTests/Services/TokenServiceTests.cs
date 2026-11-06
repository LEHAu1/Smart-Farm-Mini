using Microsoft.Extensions.Options;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Infrastructure.Services;
using System.IdentityModel.Tokens.Jwt;
using Xunit;

namespace SmartFarm.UnitTests.Services
{
    public class TokenServiceTests
    {
        private readonly TokenService _tokenService;
        private readonly JwtSettings _jwtSettings;

        public TokenServiceTests()
        {
            _jwtSettings = new JwtSettings
            {
                SecretKey = "SuperSecretKeyForTestingPurposesAtLeast32Chars!",
                Issuer = "TestIssuer",
                Audience = "TestAudience",
                AccessTokenExpiryMinutes = 15,
                RefreshTokenExpiryDays = 30
            };

            var options = Options.Create(_jwtSettings);
            _tokenService = new TokenService(options);
        }

        [Fact]
        public void GenerateAccessToken_ShouldReturnNonEmptyJwtString()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var userName = "testuser";
            var email = "test@example.com";

            // Act
            var token = _tokenService.GenerateAccessToken(userId, userName, email);

            // Assert
            Assert.False(string.IsNullOrWhiteSpace(token));

            var handler = new JwtSecurityTokenHandler();
            Assert.True(handler.CanReadToken(token));

            var jwt = handler.ReadJwtToken(token);
            Assert.Equal(_jwtSettings.Issuer, jwt.Issuer);
            Assert.Contains(_jwtSettings.Audience, jwt.Audiences);
            Assert.Equal(userId.ToString(), jwt.Subject);
        }

        [Fact]
        public void GenerateRefreshToken_ShouldReturnRawTokenAndSha256Hash()
        {
            // Act
            var (rawToken, tokenHash) = _tokenService.GenerateRefreshToken();

            // Assert
            Assert.False(string.IsNullOrWhiteSpace(rawToken));
            Assert.False(string.IsNullOrWhiteSpace(tokenHash));
            Assert.NotEqual(rawToken, tokenHash);

            // Hash of rawToken must match tokenHash
            var computedHash = _tokenService.HashToken(rawToken);
            Assert.Equal(tokenHash, computedHash);
        }

        [Fact]
        public void HashToken_SameInput_ShouldProduceIdenticalHash()
        {
            // Arrange
            var input = "consistent_token_string_123456789";

            // Act
            var hash1 = _tokenService.HashToken(input);
            var hash2 = _tokenService.HashToken(input);

            // Assert
            Assert.Equal(hash1, hash2);
        }

        [Fact]
        public void HashToken_DifferentInputs_ShouldProduceDifferentHashes()
        {
            // Act
            var hash1 = _tokenService.HashToken("token_A");
            var hash2 = _tokenService.HashToken("token_B");

            // Assert
            Assert.NotEqual(hash1, hash2);
        }
    }
}

