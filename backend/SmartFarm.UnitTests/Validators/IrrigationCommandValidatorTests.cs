using System;
using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Application.Validators;
using Xunit;

namespace SmartFarm.UnitTests.Validators
{
    public class IrrigationCommandValidatorTests
    {
        [Fact]
        public void Validate_ValidRequest_ReturnsTrue()
        {
            var request = new IrrigationCommandRequest
            {
                DeviceId = Guid.NewGuid(),
                DurationSeconds = 60
            };

            var (isValid, errorMessage) = IrrigationCommandValidator.Validate(request);

            Assert.True(isValid);
            Assert.Null(errorMessage);
        }

        [Fact]
        public void Validate_NullRequest_ReturnsFalse()
        {
            var (isValid, errorMessage) = IrrigationCommandValidator.Validate(null!);

            Assert.False(isValid);
            Assert.Equal("Request cannot be null.", errorMessage);
        }

        [Fact]
        public void Validate_EmptyDeviceId_ReturnsFalse()
        {
            var request = new IrrigationCommandRequest
            {
                DeviceId = Guid.Empty,
                DurationSeconds = 60
            };

            var (isValid, errorMessage) = IrrigationCommandValidator.Validate(request);

            Assert.False(isValid);
            Assert.Equal("DeviceId cannot be empty.", errorMessage);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-10)]
        [InlineData(301)]
        public void Validate_InvalidDurationSeconds_ReturnsFalse(int duration)
        {
            var request = new IrrigationCommandRequest
            {
                DeviceId = Guid.NewGuid(),
                DurationSeconds = duration
            };

            var (isValid, errorMessage) = IrrigationCommandValidator.Validate(request);

            Assert.False(isValid);
            Assert.Contains("DurationSeconds must be between 1 and 300 seconds", errorMessage);
        }
    }
}
