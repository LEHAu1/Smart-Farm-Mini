using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.DTOs.Auth;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Domain.Enums;
using SmartFarm.WebAPI.Controllers;

namespace SmartFarm.UnitTests.Controllers;

public class BackendEndpointsTests
{
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _deviceId = Guid.NewGuid();
    private readonly Mock<IAlertService> _alerts = new(MockBehavior.Strict);
    private readonly Mock<IDeviceService> _devices = new(MockBehavior.Strict);
    private readonly Mock<IDeviceCommandService> _commands = new(MockBehavior.Strict);
    private readonly Mock<IAuthService> _auth = new(MockBehavior.Strict);

    [Fact]
    public async Task GetAlerts_ForwardsOwnerFiltersAndPagination()
    {
        var page = new PageResult<AlertDto>(Array.Empty<AlertDto>(), 0, 2, 10);
        _alerts.Setup(service => service.GetPagedAsync(_userId, _deviceId, AlertSeverity.Critical, false,
                It.Is<PaginationParams>(p => p.PageIndex == 2 && p.PageSize == 10), CancellationToken.None))
            .ReturnsAsync(page);
        var controller = WithUser(new AlertsController(_alerts.Object, _devices.Object));

        var result = await controller.GetAll(AlertSeverity.Critical, false, _deviceId, 2, 10);

        Assert.Same(page, Assert.IsType<OkObjectResult>(result.Result).Value);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("User")]
    public async Task GetAlertSummary_UsesScopeForRole(string role)
    {
        Guid? owner = role == "Admin" ? null : _userId;
        var summary = new AlertSummaryDto(5, 1, 2, 2, 3);
        _alerts.Setup(service => service.GetSummaryAsync(owner, CancellationToken.None)).ReturnsAsync(summary);
        var controller = WithUser(new AlertsController(_alerts.Object, _devices.Object), role);

        var result = await controller.GetSummary(CancellationToken.None);

        Assert.Same(summary, Assert.IsType<OkObjectResult>(result.Result).Value);
    }

    [Fact]
    public async Task ResolveAlert_ForAnotherOwner_ReturnsNotFoundWithoutResolving()
    {
        var alert = new AlertDto { Id = Guid.NewGuid(), DeviceId = _deviceId };
        _alerts.Setup(service => service.GetByIdAsync(alert.Id, CancellationToken.None)).ReturnsAsync(alert);
        SetDeviceOwner(Guid.NewGuid());
        var controller = WithUser(new AlertsController(_alerts.Object, _devices.Object));

        var result = await controller.Resolve(alert.Id, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
        _alerts.Verify(service => service.ResolveAlertAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ResolveAlert_ReturnsResolvedAlert_AndSkipsRepeatedWrite(bool alreadyResolved)
    {
        var alertId = Guid.NewGuid();
        var alert = new AlertDto { Id = alertId, DeviceId = _deviceId, IsResolved = alreadyResolved };
        var resolved = alreadyResolved ? alert : new AlertDto { Id = alertId, DeviceId = _deviceId, IsResolved = true };
        _alerts.Setup(service => service.GetByIdAsync(alertId, CancellationToken.None)).ReturnsAsync(alert);
        if (!alreadyResolved)
            _alerts.Setup(service => service.ResolveAlertAsync(alertId, CancellationToken.None)).ReturnsAsync(resolved);
        SetDeviceOwner(_userId);
        var controller = WithUser(new AlertsController(_alerts.Object, _devices.Object));

        var result = await controller.Resolve(alertId, CancellationToken.None);

        Assert.Same(resolved, Assert.IsType<OkObjectResult>(result.Result).Value);
        _alerts.Verify(service => service.ResolveAlertAsync(alertId, CancellationToken.None),
            alreadyResolved ? Times.Never() : Times.Once());
    }

    [Fact]
    public async Task CreateCommand_ForOwnedDevice_ReturnsCreatedPendingCommand()
    {
        SetDeviceOwner(_userId);
        var command = new DeviceCommandDto { Id = Guid.NewGuid(), DeviceId = _deviceId, Status = CommandStatus.Pending };
        _commands.Setup(service => service.CreateCommandAsync(
                It.Is<CreateDeviceCommandRequest>(r => r.DeviceId == _deviceId && r.Action == "START_PUMP" && r.Payload == "{\"duration\":5}"),
                CancellationToken.None))
            .ReturnsAsync(command);
        var controller = WithUser(new DeviceCommandsController(_commands.Object, _devices.Object));

        var result = await controller.Create(_deviceId,
            new ManualDeviceCommandRequest { Action = "START_PUMP", Payload = "{\"duration\":5}" }, CancellationToken.None);

        var response = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, response.StatusCode);
        Assert.Same(command, response.Value);
    }

    [Fact]
    public async Task Commands_ForAnotherOwner_CannotCreateOrRead()
    {
        SetDeviceOwner(Guid.NewGuid());
        var controller = WithUser(new DeviceCommandsController(_commands.Object, _devices.Object));

        var create = await controller.Create(_deviceId,
            new ManualDeviceCommandRequest { Action = "STOP_PUMP" }, CancellationToken.None);
        var history = await controller.GetByDevice(_deviceId, status: null);

        Assert.IsType<NotFoundResult>(create.Result);
        Assert.IsType<NotFoundResult>(history.Result);
        _commands.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("User")]
    public async Task GetCommandHistory_UsesRoleScopeAndStatus(string role)
    {
        Guid? owner = role == "Admin" ? null : _userId;
        var page = new PageResult<DeviceCommandDto>(Array.Empty<DeviceCommandDto>(), 0, 1, 20);
        _commands.Setup(service => service.GetPagedAsync(owner, null, CommandStatus.Failed,
                It.Is<PaginationParams>(p => p.PageIndex == 1 && p.PageSize == 20), CancellationToken.None))
            .ReturnsAsync(page);
        var controller = WithUser(new DeviceCommandsController(_commands.Object, _devices.Object), role);

        var result = await controller.GetAll(CommandStatus.Failed);

        Assert.Same(page, Assert.IsType<OkObjectResult>(result.Result).Value);
    }

    [Fact]
    public async Task UpdateProfile_UsesAuthenticatedUserIdAndReturnsProfile()
    {
        var request = new UpdateProfileRequest { DisplayName = "Smart Farm", PhoneNumber = "0900000000" };
        var profile = new UserProfileDto { Id = _userId, DisplayName = request.DisplayName, PhoneNumber = request.PhoneNumber };
        _auth.Setup(service => service.UpdateProfileAsync(_userId, request, CancellationToken.None)).ReturnsAsync(profile);
        var controller = WithUser(new AuthController(_auth.Object));

        var result = await controller.UpdateProfile(request, CancellationToken.None);

        Assert.Same(profile, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task ChangePassword_UsesAuthenticatedUserIdAndReturnsNoContent()
    {
        var request = new ChangePasswordRequest
        {
            CurrentPassword = "old-password",
            NewPassword = "new-password",
            ConfirmNewPassword = "new-password"
        };
        _auth.Setup(service => service.ChangePasswordAsync(_userId, request, CancellationToken.None))
            .Returns(Task.CompletedTask);
        var controller = WithUser(new AuthController(_auth.Object));

        var result = await controller.ChangePassword(request, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task ProfileActions_WithInvalidUserId_DoNotCallAuthService()
    {
        var controller = WithUser(new AuthController(_auth.Object), subject: "invalid");

        var update = await controller.UpdateProfile(new UpdateProfileRequest(), CancellationToken.None);
        var change = await controller.ChangePassword(new ChangePasswordRequest(), CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(update);
        Assert.IsType<UnauthorizedResult>(change);
        _auth.VerifyNoOtherCalls();
    }

    private void SetDeviceOwner(Guid ownerId)
    {
        _devices.Setup(service => service.GetByIdAsync(_deviceId, CancellationToken.None))
            .ReturnsAsync(new DeviceDto { Id = _deviceId, OwnerId = ownerId });
    }

    private T WithUser<T>(T controller, string role = "User", string? subject = null) where T : ControllerBase
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, subject ?? _userId.ToString()), new Claim(ClaimTypes.Role, role)],
            "Test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }
}
