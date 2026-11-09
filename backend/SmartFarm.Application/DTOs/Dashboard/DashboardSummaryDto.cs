using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.DTOs.Irrigation;

namespace SmartFarm.Application.DTOs.Dashboard
{
    public class DashboardSummaryDto
    {
        public DeviceOverviewDto Devices { get; init; } = new();
        public SensorOverviewDto Sensors { get; init; } = new();
        public bool IsAnyPumpRunning { get; init; }
        public IReadOnlyList<AlertDto> RecentAlerts { get; init; } = [];
        public IReadOnlyList<IrrigationLogDto> RecentIrrigationLogs { get; init; } = [];
    }

    public class DeviceOverviewDto
    {
        public int TotalDevices { get; init; }
        public int OnlineDevices { get; init; }
        public int OfflineDevices { get; init; }
        public int ActiveIrrigatingDevices { get; init; }
    }

    public class SensorOverviewDto
    {
        public decimal? AverageSoilMoisture { get; init; }
        public decimal? AverageAirTemperature { get; init; }
        public decimal? AverageAirHumidity { get; init; }
        public decimal? AverageWaterTemperature { get; init; }
        public decimal? AverageWaterLevel { get; init; }
    }
}

