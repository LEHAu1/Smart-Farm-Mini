using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Services;

namespace SmartFarm.UnitTests.Services;

public sealed class AuthProfileServiceTests
{
    [Fact]
    public async Task UpdateProfileAsync_TrimsProvidedValues_AndReturnsUpdatedProfile()
    {
        var user = CreateUser();
        var userManager = CreateUserManager();
        userManager.Setup(manager => manager.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManager.Setup(manager => manager.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        userManager.Setup(manager => manager.GetClaimsAsync(user)).ReturnsAsync([]);
        var service = CreateService(userManager.Object);

        var result = await service.UpdateProfileAsync(user.Id, new UpdateProfileRequest
        {
            DisplayName = "  Greenhouse Owner  ",
            PhoneNumber = "  0900123456  "
        });

        Assert.Equal("Greenhouse Owner", user.DisplayName);
        Assert.Equal("0900123456", user.PhoneNumber);
        Assert.Equal(user.Id, result.Id);
        Assert.Equal(user.DisplayName, result.DisplayName);
        Assert.Equal(user.PhoneNumber, result.PhoneNumber);
        Assert.Equal("User", result.Role);
        userManager.Verify(manager => manager.UpdateAsync(user), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenIdentityUpdateFails_ThrowsWithIdentityError()
    {
        var user = CreateUser();
        var userManager = CreateUserManager();
        userManager.Setup(manager => manager.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManager.Setup(manager => manager.UpdateAsync(user))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "profile update rejected" }));
        var service = CreateService(userManager.Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateProfileAsync(user.Id, new UpdateProfileRequest { DisplayName = "New name" }));

        Assert.Equal("Cập nhật thông tin thất bại: profile update rejected", exception.Message);
        userManager.Verify(manager => manager.GetClaimsAsync(It.IsAny<AppUser>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenIdentityAcceptsChange_CompletesSuccessfully()
    {
        var user = CreateUser();
        var userManager = CreateUserManager();
        userManager.Setup(manager => manager.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManager.Setup(manager => manager.ChangePasswordAsync(user, "OldPassword1!", "NewPassword1!"))
            .ReturnsAsync(IdentityResult.Success);
        var service = CreateService(userManager.Object);

        await service.ChangePasswordAsync(user.Id, new ChangePasswordRequest
        {
            CurrentPassword = "OldPassword1!",
            NewPassword = "NewPassword1!",
            ConfirmNewPassword = "NewPassword1!"
        });

        userManager.Verify(manager => manager.ChangePasswordAsync(user, "OldPassword1!", "NewPassword1!"), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenIdentityRejectsChange_ThrowsWithIdentityError()
    {
        var user = CreateUser();
        var userManager = CreateUserManager();
        userManager.Setup(manager => manager.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        userManager.Setup(manager => manager.ChangePasswordAsync(user, "OldPassword1!", "NewPassword1!"))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "password rejected" }));
        var service = CreateService(userManager.Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ChangePasswordAsync(user.Id, new ChangePasswordRequest
            {
                CurrentPassword = "OldPassword1!",
                NewPassword = "NewPassword1!",
                ConfirmNewPassword = "NewPassword1!"
            }));

        Assert.Equal("Đổi mật khẩu thất bại: password rejected", exception.Message);
        userManager.Verify(manager => manager.ChangePasswordAsync(user, "OldPassword1!", "NewPassword1!"), Times.Once);
    }

    private static AppUser CreateUser() => new()
    {
        Id = Guid.NewGuid(),
        UserName = "farm-user",
        Email = "farm@example.com",
        DisplayName = "Previous name",
        PhoneNumber = "0900000000",
        CreatedAtUtc = DateTimeOffset.UtcNow
    };

    private static Mock<UserManager<AppUser>> CreateUserManager()
    {
        var store = new Mock<IUserStore<AppUser>>();
        return new Mock<UserManager<AppUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    private static AuthService CreateService(UserManager<AppUser> userManager)
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=localhost;Database=SmartFarmUnitTests;Trusted_Connection=True")
            .Options;
        var context = new SmartFarmDbContext(options);
        return new AuthService(userManager, context, Mock.Of<ITokenService>(),
            Mock.Of<IGoogleAuthService>(), Options.Create(new JwtSettings()));
    }
}
