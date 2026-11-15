using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Application.Validators;
using Xunit;

namespace SmartFarm.UnitTests.Validators
{
    public class IrrigationRuleValidatorTests
    {
        [Fact]
        public void Validate_ValidRequest_ReturnsTrue()
        {
            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Cà chua tiêu chuẩn",
                MoistureThreshold = 30.0m,
                TargetMoisture = 65.0m,
                MinIntervalMinutes = 60,
                MaxDurationSeconds = 120
            };

            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(request);

            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_NullRequest_ReturnsFalse()
        {
            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(null!);

            Assert.False(isValid);
            Assert.Equal("Request cannot be null.", errorMessage);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void Validate_EmptyName_ReturnsFalse(string name)
        {
            var request = new UpdateIrrigationRuleRequest
            {
                Name = name,
                MoistureThreshold = 30.0m,
                TargetMoisture = 65.0m,
                MinIntervalMinutes = 60,
                MaxDurationSeconds = 120
            };

            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(request);

            Assert.False(isValid);
            Assert.Equal("Rule name is required.", errorMessage);
        }

        [Fact]
        public void Validate_TargetMoistureNotGreaterThanThreshold_ReturnsFalse()
        {
            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Quy tắc lỗi",
                MoistureThreshold = 50.0m,
                TargetMoisture = 50.0m,
                MinIntervalMinutes = 60,
                MaxDurationSeconds = 120
            };

            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(request);

            Assert.False(isValid);
            Assert.Equal("TargetMoisture must be strictly greater than MoistureThreshold.", errorMessage);
        }

        [Fact]
        public void Validate_NegativeMinIntervalMinutes_ReturnsFalse()
        {
            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Quy tắc lỗi",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = -1,
                MaxDurationSeconds = 120
            };

            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(request);

            Assert.False(isValid);
            Assert.Equal("MinIntervalMinutes cannot be negative.", errorMessage);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(301)]
        public void Validate_InvalidMaxDurationSeconds_ReturnsFalse(int maxDuration)
        {
            var request = new UpdateIrrigationRuleRequest
            {
                Name = "Quy tắc lỗi",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = 60,
                MaxDurationSeconds = maxDuration
            };

            var (isValid, errorMessage) = UpdateIrrigationRuleValidator.Validate(request);

            Assert.False(isValid);
            Assert.Equal("MaxDurationSeconds must be between 1 and 300 seconds.", errorMessage);
        }

        [Theory]
        [InlineData(-1, 50)]
        [InlineData(30, 101)]
        public void ValidateCreate_MoistureOutOfRange_ReturnsFalse(decimal threshold, decimal target)
        {
            var request = new CreateIrrigationRuleRequest
            {
                DeviceId = Guid.NewGuid(),
                Name = "Quy tắc độ ẩm lỗi",
                MoistureThreshold = threshold,
                TargetMoisture = target,
                MinIntervalMinutes = 30,
                MaxDurationSeconds = 120
            };

            var (isValid, _) = IrrigationRuleValidator.ValidateCreate(request);

            Assert.False(isValid);
        }

        [Fact]
        public void ValidateCreate_DurationExceeds300_ReturnsFalse()
        {
            var request = new CreateIrrigationRuleRequest
            {
                DeviceId = Guid.NewGuid(),
                Name = "Quy tắc quá 300s",
                MoistureThreshold = 30.0m,
                TargetMoisture = 60.0m,
                MinIntervalMinutes = 30,
                MaxDurationSeconds = 301
            };

            var (isValid, errorMessage) = IrrigationRuleValidator.ValidateCreate(request);

            Assert.False(isValid);
            Assert.Equal("MaxDurationSeconds must be between 1 and 300 seconds.", errorMessage);
        }
    }
}
