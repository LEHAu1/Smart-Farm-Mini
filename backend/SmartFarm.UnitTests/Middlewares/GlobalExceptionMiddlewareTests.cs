using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using SmartFarm.WebAPI.Middlewares;

namespace SmartFarm.UnitTests.Middlewares;

public class GlobalExceptionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_WhenUnexpectedExceptionOccurs_ReturnsInternalServerError()
    {
        var logger = Mock.Of<ILogger<GlobalExceptionMiddleware>>();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(value => value.EnvironmentName).Returns(Environments.Production);
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new Exception("Internal state detail"),
            logger,
            environment.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var response = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Equal("Đã có lỗi hệ thống xảy ra.", response.RootElement.GetProperty("error").GetString());
        Assert.DoesNotContain("Internal state detail", response.RootElement.GetRawText());
    }

    [Fact]
    public async Task InvokeAsync_WhenBusinessConflictUsesInvalidOperationException_ReturnsBadRequest()
    {
        var logger = Mock.Of<ILogger<GlobalExceptionMiddleware>>();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(value => value.EnvironmentName).Returns(Environments.Production);
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new InvalidOperationException("Thiết bị với mã 'DEVICE-01' đã tồn tại trong hệ thống."),
            logger,
            environment.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var response = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Contains("DEVICE-01", response.RootElement.GetProperty("error").GetString());
    }
}
