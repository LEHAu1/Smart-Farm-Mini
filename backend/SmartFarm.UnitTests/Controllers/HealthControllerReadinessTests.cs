using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.WebAPI.Controllers;

namespace SmartFarm.UnitTests.Controllers;

public class HealthControllerReadinessTests
{
    [Fact]
    public async Task Ready_WhenDatabaseProbeIsCanceledWithoutClientAbort_ReturnsServiceUnavailable()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=127.0.0.1,1;Database=private-db;User Id=private-user;Password=private-password;TrustServerCertificate=True;Connect Timeout=1;")
            .Options;
        await using var db = new SmartFarmDbContext(options);
        var controller = new HealthController(db);
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var result = await controller.Ready(cts.Token);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        var body = JsonSerializer.Serialize(unavailable.Value);
        Assert.DoesNotContain("private-db", body);
        Assert.DoesNotContain("private-user", body);
        Assert.DoesNotContain("private-password", body);
    }

    [Fact]
    public async Task Ready_WhenClientAbortsRequest_PropagatesCancellation()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=127.0.0.1,1;Database=private-db;User Id=private-user;Password=private-password;TrustServerCertificate=True;Connect Timeout=1;")
            .Options;
        await using var db = new SmartFarmDbContext(options);
        var controller = new HealthController(db);
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { RequestAborted = cts.Token }
        };

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => controller.Ready(cts.Token));
    }

    [Fact]
    public async Task Ready_WhenDatabaseIsUnavailable_DoesNotExposeConnectionError()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=127.0.0.1,1;Database=private-db;User Id=private-user;Password=private-password;TrustServerCertificate=True;Connect Timeout=1;")
            .Options;
        await using var db = new SmartFarmDbContext(options);
        var controller = new HealthController(db);

        var result = await controller.Ready(CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        var body = JsonSerializer.Serialize(unavailable.Value);
        Assert.DoesNotContain("private-db", body);
        Assert.DoesNotContain("private-user", body);
        Assert.DoesNotContain("private-password", body);
        Assert.DoesNotContain("Error:", body);
    }
}
