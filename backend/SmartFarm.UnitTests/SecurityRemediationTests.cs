using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Infrastructure.Identity;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Services;
using SmartFarm.Infrastructure;
using SmartFarm.WebAPI.Controllers;

namespace SmartFarm.UnitTests;

public class SecurityRemediationTests
{
    [Fact]
    public async Task Register_RequestedAdminRole_IsIgnoredAndIssuesUserClaim()
    {
        var userStore = new Mock<IUserStore<AppUser>>();
        var userManager = CreateUserManager(userStore.Object);
        AppUser? createdUser = null;
        Claim? addedClaim = null;

        userManager.Setup(x => x.FindByNameAsync(It.IsAny<string>())).ReturnsAsync((AppUser?)null);
        userManager.Setup(x => x.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((AppUser?)null);
        userManager.Setup(x => x.CreateAsync(It.IsAny<AppUser>(), It.IsAny<string>()))
            .Callback<AppUser, string>((user, _) => createdUser = user)
            .ReturnsAsync(IdentityResult.Success);
        userManager.Setup(x => x.AddClaimAsync(It.IsAny<AppUser>(), It.IsAny<Claim>()))
            .Callback<AppUser, Claim>((_, claim) => addedClaim = claim)
            .ReturnsAsync(IdentityResult.Success);

        var context = CreateContext();
        var tokenService = new Mock<ITokenService>();
        tokenService.Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("access-token");
        tokenService.Setup(x => x.GenerateRefreshToken()).Returns(("refresh-token", "refresh-hash"));
        var service = new AuthService(userManager.Object, context.Object, tokenService.Object,
            Options.Create(new JwtSettings { SecretKey = "unit-test-key", RefreshTokenExpiryDays = 30, AccessTokenExpiryMinutes = 15 }));

        // Simulate a legacy/client JSON request that still sends the former Role field.
        var request = JsonSerializer.Deserialize<RegisterRequest>("""
            {"userName":"new-user","email":"new@example.com","password":"Password1!","role":"Admin"}
            """, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

        var response = await service.RegisterAsync(request);

        Assert.Equal("User", response.User.Role);
        Assert.NotNull(createdUser);
        Assert.Equal(ClaimTypes.Role, addedClaim?.Type);
        Assert.Equal("User", addedClaim?.Value);
        tokenService.Verify(x => x.GenerateAccessToken(createdUser!.Id, "new-user", "new@example.com", "User"), Times.Once);
    }

    [Fact]
    public async Task Login_WrongPassword_RecordsFailedAttempt()
    {
        var user = new AppUser { Id = Guid.NewGuid(), UserName = "user", Email = "user@example.com" };
        var userStore = new Mock<IUserStore<AppUser>>();
        var userManager = CreateUserManager(userStore.Object);
        userManager.Setup(x => x.FindByNameAsync("user")).ReturnsAsync(user);
        userManager.Setup(x => x.CheckPasswordAsync(user, "wrong-password")).ReturnsAsync(false);
        userManager.Setup(x => x.IsLockedOutAsync(user)).ReturnsAsync(false);
        userManager.Setup(x => x.AccessFailedAsync(user)).ReturnsAsync(IdentityResult.Success);

        var service = new AuthService(userManager.Object, CreateContext().Object, Mock.Of<ITokenService>(),
            Options.Create(new JwtSettings()));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.LoginAsync(
            new LoginRequest { UserNameOrEmail = "user", Password = "wrong-password" }));

        userManager.Verify(x => x.AccessFailedAsync(user), Times.Once);
        userManager.Verify(x => x.ResetAccessFailedCountAsync(It.IsAny<AppUser>()), Times.Never);
    }

    [Fact]
    public async Task Login_FifthFailedAttemptLocksAccount_AndNextAttemptIsRejectedBeforePasswordCheck()
    {
        var user = new AppUser { Id = Guid.NewGuid(), UserName = "user", Email = "user@example.com" };
        var userStore = new Mock<IUserStore<AppUser>>();
        var userManager = CreateUserManager(userStore.Object);
        var failedAttempts = 0;
        var isLockedOut = false;

        userManager.Setup(x => x.FindByNameAsync("user")).ReturnsAsync(user);
        userManager.Setup(x => x.IsLockedOutAsync(user)).ReturnsAsync(() => isLockedOut);
        userManager.Setup(x => x.CheckPasswordAsync(user, "wrong-password")).ReturnsAsync(false);
        userManager.Setup(x => x.AccessFailedAsync(user)).ReturnsAsync(() =>
        {
            failedAttempts++;
            isLockedOut = failedAttempts >= 5;
            return IdentityResult.Success;
        });

        var service = new AuthService(userManager.Object, CreateContext().Object, Mock.Of<ITokenService>(),
            Options.Create(new JwtSettings()));
        var request = new LoginRequest { UserNameOrEmail = "user", Password = "wrong-password" };

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.LoginAsync(request));
        }

        var lockedException = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.LoginAsync(request));

        Assert.Contains("tạm khóa", lockedException.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(5, failedAttempts);
        userManager.Verify(x => x.CheckPasswordAsync(user, "wrong-password"), Times.Exactly(5));
        userManager.Verify(x => x.AccessFailedAsync(user), Times.Exactly(5));
    }

    [Fact]
    public async Task Login_CorrectPassword_ResetsFailedAttemptCount()
    {
        var user = new AppUser { Id = Guid.NewGuid(), UserName = "user", Email = "user@example.com" };
        var userStore = new Mock<IUserStore<AppUser>>();
        var userManager = CreateUserManager(userStore.Object);
        userManager.Setup(x => x.FindByNameAsync("user")).ReturnsAsync(user);
        userManager.Setup(x => x.IsLockedOutAsync(user)).ReturnsAsync(false);
        userManager.Setup(x => x.CheckPasswordAsync(user, "correct-password")).ReturnsAsync(true);
        userManager.Setup(x => x.ResetAccessFailedCountAsync(user)).ReturnsAsync(IdentityResult.Success);
        userManager.Setup(x => x.GetClaimsAsync(user)).ReturnsAsync(new List<Claim>());

        var tokenService = new Mock<ITokenService>();
        tokenService.Setup(x => x.GenerateAccessToken(user.Id, "user", "user@example.com", "User"))
            .Returns("access-token");
        tokenService.Setup(x => x.GenerateRefreshToken()).Returns(("refresh-token", "refresh-hash"));
        var service = new AuthService(userManager.Object, CreateContext().Object, tokenService.Object,
            Options.Create(new JwtSettings { RefreshTokenExpiryDays = 30, AccessTokenExpiryMinutes = 15 }));

        var response = await service.LoginAsync(new LoginRequest
        {
            UserNameOrEmail = "user",
            Password = "correct-password"
        });

        Assert.Equal("access-token", response.AccessToken);
        userManager.Verify(x => x.ResetAccessFailedCountAsync(user), Times.Once);
        userManager.Verify(x => x.AccessFailedAsync(It.IsAny<AppUser>()), Times.Never);
    }

    [Fact]
    public void IdentityConfiguration_UsesFiveFailedAttemptsAndFifteenMinuteLockout()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=SmartFarmUnitTests;Trusted_Connection=True"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<IdentityOptions>>().Value;

        Assert.Equal(5, options.Lockout.MaxFailedAccessAttempts);
        Assert.Equal(TimeSpan.FromMinutes(15), options.Lockout.DefaultLockoutTimeSpan);
    }

    [Fact]
    public async Task Create_NonAdmin_OverridesCallerSuppliedOwnerId()
    {
        var callerId = Guid.NewGuid();
        var otherOwnerId = Guid.NewGuid();
        var service = new Mock<IDeviceService>();
        CreateDeviceRequest? persistedRequest = null;
        service.Setup(x => x.CreateAsync(It.IsAny<CreateDeviceRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateDeviceRequest, CancellationToken>((request, _) => persistedRequest = request)
            .ReturnsAsync(new DeviceDto { Id = Guid.NewGuid(), OwnerId = callerId });
        var controller = CreateController(service.Object, callerId, "User");

        await controller.Create(new CreateDeviceRequest
        {
            OwnerId = otherOwnerId,
            DeviceCode = "device-1",
            Name = "Device"
        }, CancellationToken.None);

        Assert.NotNull(persistedRequest);
        Assert.Equal(callerId, persistedRequest.OwnerId);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DeviceStateMutation_OtherOwnersDevice_IsNotFound(bool deactivate)
    {
        var callerId = Guid.NewGuid();
        var deviceId = Guid.NewGuid();
        var service = new Mock<IDeviceService>();
        service.Setup(x => x.GetByIdAsync(deviceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeviceDto { Id = deviceId, OwnerId = Guid.NewGuid() });
        var controller = CreateController(service.Object, callerId, "User");

        var result = deactivate
            ? await controller.Deactivate(deviceId, CancellationToken.None)
            : await controller.Activate(deviceId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        service.Verify(x => x.DeactivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        service.Verify(x => x.ActivateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Mock<UserManager<AppUser>> CreateUserManager(IUserStore<AppUser> store) =>
        new(store, null!, null!, null!, null!, null!, null!, null!, null!);

    private static Mock<SmartFarmDbContext> CreateContext()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=localhost;Database=SmartFarmUnitTests;Trusted_Connection=True")
            .Options;
        var context = new Mock<SmartFarmDbContext>(options) { CallBase = true };
        context.Setup(x => x.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        return context;
    }

    private static DevicesController CreateController(IDeviceService deviceService, Guid userId, string role)
    {
        var controller = new DevicesController(deviceService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim(ClaimTypes.Role, role)
                    ], "test"))
                }
            }
        };
        return controller;
    }
}
