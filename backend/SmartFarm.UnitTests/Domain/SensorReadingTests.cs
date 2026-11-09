using System;
using SmartFarm.Domain.Constants;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using Xunit;

namespace SmartFarm.UnitTests.Domain
{
    public class SensorReadingTests
    {
        private readonly Guid _validDeviceId = Guid.NewGuid();
        private readonly DateTimeOffset _validUtc = DateTimeOffset.UtcNow;

        [Fact]
        public void Constructor_ValidParameters_ShouldCreateSuccessfully()
        {
            // Act
            var reading = new SensorReading(
                _validDeviceId,
                SensorType.SoilMoisture,
                45.5m,
                "%",
                _validUtc,
                _validUtc);

            // Assert
            Assert.NotEqual(Guid.Empty, reading.Id);
            Assert.Equal(_validDeviceId, reading.DeviceId);
            Assert.Equal(SensorType.SoilMoisture, reading.SensorType);
            Assert.Equal(45.5m, reading.Value);
            Assert.Equal("%", reading.Unit);
            Assert.Equal(_validUtc, reading.RecordedAtUtc);
            Assert.Equal(_validUtc, reading.ReceivedAtUtc);
        }

        [Fact]
        public void Constructor_EmptyDeviceId_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => new SensorReading(
                Guid.Empty,
                SensorType.AirTemperature,
                25.0m,
                "°C",
                _validUtc,
                _validUtc));
        }

        [Fact]
        public void Constructor_EmptyUnit_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => new SensorReading(
                _validDeviceId,
                SensorType.AirTemperature,
                25.0m,
                "  ",
                _validUtc,
                _validUtc));
        }

        [Fact]
        public void Constructor_NonUtcTimestamp_ThrowsArgumentException()
        {
            var nonUtc = new DateTimeOffset(2026, 11, 6, 12, 0, 0, TimeSpan.FromHours(7));

            Assert.Throws<ArgumentException>(() => new SensorReading(
                _validDeviceId,
                SensorType.AirTemperature,
                25.0m,
                "°C",
                nonUtc,
                _validUtc));
        }

        [Fact]
        public void Constructor_ReceivedEarlierThanRecorded_ThrowsArgumentException()
        {
            var recorded = _validUtc;
            var receivedEarlier = _validUtc.AddMinutes(-5);

            Assert.Throws<ArgumentException>(() => new SensorReading(
                _validDeviceId,
                SensorType.AirTemperature,
                25.0m,
                "°C",
                recorded,
                receivedEarlier));
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(101)]
        public void Constructor_SoilMoistureOutOfRange_ThrowsArgumentOutOfRangeException(decimal invalidValue)
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new SensorReading(
                _validDeviceId,
                SensorType.SoilMoisture,
                invalidValue,
                "%",
                _validUtc,
                _validUtc));
        }

        [Theory]
        [InlineData(-51)]
        [InlineData(101)]
        public void Constructor_TemperatureOutOfRange_ThrowsArgumentOutOfRangeException(decimal invalidValue)
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new SensorReading(
                _validDeviceId,
                SensorType.AirTemperature,
                invalidValue,
                "°C",
                _validUtc,
                _validUtc));
        }

        [Fact]
        public void Constructor_NegativeWaterLevel_ThrowsArgumentOutOfRangeException()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new SensorReading(
                _validDeviceId,
                SensorType.WaterLevel,
                -5m,
                "cm",
                _validUtc,
                _validUtc));
        }
    }
}
