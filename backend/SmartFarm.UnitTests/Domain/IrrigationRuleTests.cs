using System;
using SmartFarm.Domain.Entities;
using Xunit;

namespace SmartFarm.UnitTests.Domain
{
    public class IrrigationRuleTests
    {
        private readonly Guid _validDeviceId = Guid.NewGuid();
        private readonly DateTimeOffset _validUtc = DateTimeOffset.UtcNow;

        [Fact]
        public void Constructor_ValidParameters_ShouldCreateSuccessfully()
        {
            // Arrange & Act
            var rule = new IrrigationRule(
                deviceId: _validDeviceId,
                name: "Tưới cây Kim Tiền buổi sáng",
                moistureThreshold: 30.0m,
                targetMoisture: 65.0m,
                minIntervalMinutes: 60,
                maxDurationSeconds: 120,
                createdAtUtc: _validUtc);

            // Assert
            Assert.NotEqual(Guid.Empty, rule.Id);
            Assert.Equal(_validDeviceId, rule.DeviceId);
            Assert.Equal("Tưới cây Kim Tiền buổi sáng", rule.Name);
            Assert.Equal(30.0m, rule.MoistureThreshold);
            Assert.Equal(65.0m, rule.TargetMoisture);
            Assert.Equal(60, rule.MinIntervalMinutes);
            Assert.Equal(120, rule.MaxDurationSeconds);
            Assert.True(rule.IsEnabled);
            Assert.Null(rule.LastTriggeredAtUtc);
        }

        [Theory]
        [InlineData(50, 50)]  // Target bằng Threshold -> Không hợp lệ
        [InlineData(50, 40)]  // Target bé hơn Threshold -> Không hợp lệ
        public void Constructor_TargetMoistureLessOrEqualToThreshold_ShouldThrowArgumentException(
            decimal threshold, decimal target)
        {
            // Act & Assert
            var ex = Assert.Throws<ArgumentException>(() => new IrrigationRule(
                deviceId: _validDeviceId,
                name: "Quy tắc không hợp lệ",
                moistureThreshold: threshold,
                targetMoisture: target,
                minIntervalMinutes: 30,
                maxDurationSeconds: 60,
                createdAtUtc: _validUtc));

            Assert.Contains("Target moisture must be greater than moisture threshold", ex.Message);
        }

        [Theory]
        [InlineData(-5, 60)]   // Threshold âm
        [InlineData(110, 120)] // Threshold vượt 100%
        public void Constructor_ThresholdOutsideValidRange_ShouldThrowArgumentOutOfRangeException(
            decimal threshold, decimal target)
        {
            // Act & Assert
            Assert.Throws<ArgumentOutOfRangeException>(() => new IrrigationRule(
                deviceId: _validDeviceId,
                name: "Ngưỡng vượt biên",
                moistureThreshold: threshold,
                targetMoisture: target,
                minIntervalMinutes: 30,
                maxDurationSeconds: 60,
                createdAtUtc: _validUtc));
        }

        [Fact]
        public void Constructor_NonUtcTimestamp_ShouldThrowArgumentException()
        {
            // Arrange: Múi giờ GMT+7 (không phải UTC offset 0)
            var nonUtc = new DateTimeOffset(2026, 11, 4, 15, 0, 0, TimeSpan.FromHours(7));

            // Act & Assert
            var ex = Assert.Throws<ArgumentException>(() => new IrrigationRule(
                deviceId: _validDeviceId,
                name: "Sai múi giờ",
                moistureThreshold: 30m,
                targetMoisture: 60m,
                minIntervalMinutes: 30,
                maxDurationSeconds: 60,
                createdAtUtc: nonUtc));

            Assert.Contains("UTC offset", ex.Message);
        }

        [Fact]
        public void ShouldTrigger_MoistureBelowThresholdAndEnabled_ShouldReturnTrue()
        {
            // Arrange
            var rule = new IrrigationRule(
                _validDeviceId, "Auto Rule", 35.0m, 70.0m, 60, 120, _validUtc);

            // Act: Độ ẩm hiện tại là 25% (nhỏ hơn ngưỡng 35%)
            var result = rule.ShouldTrigger(25.0m);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public void ShouldTrigger_MoistureAboveThreshold_ShouldReturnFalse()
        {
            // Arrange
            var rule = new IrrigationRule(
                _validDeviceId, "Auto Rule", 35.0m, 70.0m, 60, 120, _validUtc);

            // Act: Độ ẩm hiện tại 40% (cao hơn ngưỡng 35%)
            var result = rule.ShouldTrigger(40.0m);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public void ShouldTrigger_RuleDisabled_ShouldReturnFalse()
        {
            // Arrange
            var rule = new IrrigationRule(
                _validDeviceId, "Auto Rule", 35.0m, 70.0m, 60, 120, _validUtc);
            rule.Disable(_validUtc.AddMinutes(1));

            // Act: Dù độ ẩm thấp nhưng quy tắc bị tắt (Disable)
            var result = rule.ShouldTrigger(20.0m);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public void RecordTrigger_BeforeMinIntervalElapsed_ShouldThrowInvalidOperationException()
        {
            // Arrange: Khoảng cách tối thiểu là 60 phút
            var rule = new IrrigationRule(
                _validDeviceId, "Auto Rule", 30.0m, 60.0m, 60, 120, _validUtc);

            var firstTrigger = _validUtc.AddMinutes(10);
            rule.RecordTrigger(firstTrigger);

            // Act: Cố kích hoạt lần 2 chỉ sau 30 phút (< 60 phút)
            var tooEarlyTrigger = firstTrigger.AddMinutes(30);

            // Assert
            var ex = Assert.Throws<InvalidOperationException>(() => rule.RecordTrigger(tooEarlyTrigger));
            Assert.Contains("Minimum interval between irrigation triggers has not elapsed", ex.Message);
        }

        [Fact]
        public void RecordTrigger_ValidInterval_ShouldUpdateLastTriggeredAtUtc()
        {
            // Arrange
            var rule = new IrrigationRule(
                _validDeviceId, "Auto Rule", 30.0m, 60.0m, 60, 120, _validUtc);

            var firstTrigger = _validUtc.AddMinutes(10);
            rule.RecordTrigger(firstTrigger);

            var nextValidTrigger = firstTrigger.AddMinutes(65); // Đã qua 60 phút
            rule.RecordTrigger(nextValidTrigger);

            // Assert
            Assert.Equal(nextValidTrigger, rule.LastTriggeredAtUtc);
        }
    }
}
