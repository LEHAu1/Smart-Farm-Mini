using SmartFarm.Domain.Entities;
using Xunit;

namespace SmartFarm.UnitTests.Domain
{
    public class RefreshTokenTests
    {
        [Fact]
        public void Constructor_WhenValidArguments_ShouldInitializeCorrectly()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var tokenHash = "dummyHash123456";
            var tokenFamily = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;
            var expiresAt = now.AddDays(30);

            // Act
            var token = new RefreshToken(userId, tokenHash, tokenFamily, expiresAt, now);

            // Assert
            Assert.NotEqual(Guid.Empty, token.Id);
            Assert.Equal(userId, token.UserId);
            Assert.Equal(tokenHash, token.TokenHash);
            Assert.Equal(tokenFamily, token.TokenFamily);
            Assert.Equal(expiresAt, token.ExpiresAtUtc);
            Assert.Equal(now, token.CreatedAtUtc);
            Assert.Null(token.RevokedAtUtc);
            Assert.False(token.IsRevoked);
            Assert.False(token.IsExpired);
            Assert.True(token.IsActive);
        }

        [Fact]
        public void Constructor_WhenUserIdIsEmpty_ShouldThrowArgumentException()
        {
            // Arrange
            var now = DateTimeOffset.UtcNow;

            // Act & Assert
            Assert.Throws<ArgumentException>(() =>
                new RefreshToken(Guid.Empty, "hash", Guid.NewGuid(), now.AddDays(1), now));
        }

        [Fact]
        public void Constructor_WhenExpiresAtBeforeCreatedAt_ShouldThrowArgumentException()
        {
            // Arrange
            var now = DateTimeOffset.UtcNow;

            // Act & Assert
            Assert.Throws<ArgumentException>(() =>
                new RefreshToken(Guid.NewGuid(), "hash", Guid.NewGuid(), now.AddDays(-1), now));
        }

        [Fact]
        public void Revoke_ShouldMarkTokenAsRevokedWithReason()
        {
            // Arrange
            var now = DateTimeOffset.UtcNow;
            var token = new RefreshToken(Guid.NewGuid(), "hash", Guid.NewGuid(), now.AddDays(30), now);

            // Act
            var revokeTime = now.AddHours(1);
            token.Revoke(revokeTime, "LOGOUT", "replacedHash999");

            // Assert
            Assert.True(token.IsRevoked);
            Assert.False(token.IsActive);
            Assert.Equal(revokeTime, token.RevokedAtUtc);
            Assert.Equal("LOGOUT", token.RevokeReason);
            Assert.Equal("replacedHash999", token.ReplacedByTokenHash);
        }

        [Fact]
        public void Revoke_WhenAlreadyRevoked_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var now = DateTimeOffset.UtcNow;
            var token = new RefreshToken(Guid.NewGuid(), "hash", Guid.NewGuid(), now.AddDays(30), now);
            token.Revoke(now.AddMinutes(5), "ROTATED");

            // Act & Assert
            Assert.Throws<InvalidOperationException>(() =>
                token.Revoke(now.AddMinutes(10), "ROTATED"));
        }
    }
}

