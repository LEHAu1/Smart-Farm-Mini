using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Services;
using SmartFarm.Domain.Enums;

namespace SmartFarm.UnitTests.Services;

public class SensorHistoryRangeLimitTests
{
    [Fact]
    public async Task GetSensorHistoryAsync_RejectsRangesLongerThanSevenDaysBeforeQueryingRepository()
    {
        var readingRepository = new Mock<ISensorReadingRepository>();
        var service = new SensorService(
            readingRepository.Object,
            Mock.Of<ISensorReadingAggregateRepository>(),
            Mock.Of<IDeviceRepository>(),
            NullLogger<SensorService>.Instance);
        var to = DateTimeOffset.UtcNow;

        var exception = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            service.GetSensorHistoryAsync(
                Guid.NewGuid(),
                SensorType.SoilMoisture,
                to.AddDays(-8),
                to));

        Assert.Contains("7 days", exception.Message);
        readingRepository.Verify(
            repository => repository.GetByDeviceIdAndRangeAsync(
                It.IsAny<Guid>(),
                It.IsAny<SensorType?>(),
                It.IsAny<DateTimeOffset>(),
                It.IsAny<DateTimeOffset>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
