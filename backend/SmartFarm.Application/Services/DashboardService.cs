using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Alert;
using SmartFarm.Application.DTOs.Dashboard;
using SmartFarm.Application.DTOs.Irrigation;
using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDeviceRepository _deviceRepository;
        private readonly ISensorReadingRepository _sensorReadingRepository;
        private readonly IIrrigationLogRepository _irrigationLogRepository;
        private readonly IAlertRepository _alertRepository;

        public DashboardService(
            IDeviceRepository deviceRepository,
            ISensorReadingRepository sensorReadingRepository,
            IIrrigationLogRepository irrigationLogRepository,
            IAlertRepository alertRepository)
        {
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _sensorReadingRepository = sensorReadingRepository ?? throw new ArgumentNullException(nameof(sensorReadingRepository));
            _irrigationLogRepository = irrigationLogRepository ?? throw new ArgumentNullException(nameof(irrigationLogRepository));
            _alertRepository = alertRepository ?? throw new ArgumentNullException(nameof(alertRepository));
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync(Guid? ownerId, CancellationToken cancellationToken = default)
        {
            var devices = (ownerId.HasValue && ownerId.Value != Guid.Empty)
                ? await _deviceRepository.GetByOwnerIdAsync(ownerId.Value, cancellationToken)
                : await _deviceRepository.GetAllAsync(cancellationToken);

            var totalDevices = devices.Count;
            var onlineDevices = devices.Count(d => d.IsOnline);
            var offlineDevices = totalDevices - onlineDevices;

            var deviceIds = devices.Select(d => d.Id).ToHashSet();

            // 1. Kiểm tra thiết bị đang tưới
            var activeIrrigatingCount = 0;
            var recentLogs = new List<IrrigationLogDto>();

            foreach (var device in devices)
            {
                var activeLog = await _irrigationLogRepository.GetCurrentInProgressByDeviceIdAsync(device.Id, cancellationToken);
                if (activeLog != null)
                {
                    activeIrrigatingCount++;
                }

                var logs = await _irrigationLogRepository.GetByDeviceIdAsync(device.Id, 5, cancellationToken);
                if (logs != null)
                {
                    recentLogs.AddRange(logs.Select(l => new IrrigationLogDto
                    {
                        Id = l.Id,
                        DeviceId = l.DeviceId,
                        Mode = l.Mode,
                        Status = l.Status,
                        SoilMoistureBefore = l.SoilMoistureBefore,
                        SoilMoistureAfter = l.SoilMoistureAfter,
                        WaterAmountMl = l.WaterAmountMl,
                        StartedAtUtc = l.StartedAtUtc,
                        CompletedAtUtc = l.CompletedAtUtc,
                        DurationSeconds = l.DurationSeconds,
                        Note = l.Note
                    }));
                }
            }

            // Top 5 phiên tưới mới nhất
            var topRecentLogs = recentLogs
                .OrderByDescending(l => l.StartedAtUtc)
                .Take(5)
                .ToList();

            // 2. Tổng quan cảm biến (Tính trung bình chỉ số mới nhất từ các thiết bị)
            var soilMoistureList = new List<decimal>();
            var airTempList = new List<decimal>();
            var airHumList = new List<decimal>();
            var waterTempList = new List<decimal>();
            var waterLevelList = new List<decimal>();

            foreach (var device in devices)
            {
                var latest = await _sensorReadingRepository.GetLatestByDeviceIdAsync(device.Id, 10, cancellationToken);
                if (latest != null)
                {
                    var latestSoil = latest.FirstOrDefault(r => r.SensorType == SensorType.SoilMoisture);
                    var latestAirTemp = latest.FirstOrDefault(r => r.SensorType == SensorType.AirTemperature);
                    var latestAirHum = latest.FirstOrDefault(r => r.SensorType == SensorType.AirHumidity);
                    var latestWaterTemp = latest.FirstOrDefault(r => r.SensorType == SensorType.WaterTemperature);
                    var latestWaterLevel = latest.FirstOrDefault(r => r.SensorType == SensorType.WaterLevel);

                    if (latestSoil != null) soilMoistureList.Add(latestSoil.Value);
                    if (latestAirTemp != null) airTempList.Add(latestAirTemp.Value);
                    if (latestAirHum != null) airHumList.Add(latestAirHum.Value);
                    if (latestWaterTemp != null) waterTempList.Add(latestWaterTemp.Value);
                    if (latestWaterLevel != null) waterLevelList.Add(latestWaterLevel.Value);
                }
            }

            var sensorsOverview = new SensorOverviewDto
            {
                AverageSoilMoisture = soilMoistureList.Count > 0 ? Math.Round(soilMoistureList.Average(), 1) : null,
                AverageAirTemperature = airTempList.Count > 0 ? Math.Round(airTempList.Average(), 1) : null,
                AverageAirHumidity = airHumList.Count > 0 ? Math.Round(airHumList.Average(), 1) : null,
                AverageWaterTemperature = waterTempList.Count > 0 ? Math.Round(waterTempList.Average(), 1) : null,
                AverageWaterLevel = waterLevelList.Count > 0 ? Math.Round(waterLevelList.Average(), 1) : null
            };

            // 3. Top 5 cảnh báo chưa xử lý
            var allUnresolvedAlerts = await _alertRepository.GetUnresolvedAlertsAsync(cancellationToken);
            var filteredAlerts = allUnresolvedAlerts
                .Where(a => deviceIds.Contains(a.DeviceId))
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(5)
                .Select(a => new AlertDto
                {
                    Id = a.Id,
                    DeviceId = a.DeviceId,
                    AlertCode = a.AlertCode,
                    Title = a.Title,
                    Message = a.Message,
                    Severity = a.Severity,
                    IsResolved = a.IsResolved,
                    CreatedAtUtc = a.CreatedAtUtc,
                    ResolvedAtUtc = a.ResolvedAtUtc
                })
                .ToList();

            return new DashboardSummaryDto
            {
                Devices = new DeviceOverviewDto
                {
                    TotalDevices = totalDevices,
                    OnlineDevices = onlineDevices,
                    OfflineDevices = offlineDevices,
                    ActiveIrrigatingDevices = activeIrrigatingCount
                },
                Sensors = sensorsOverview,
                IsAnyPumpRunning = activeIrrigatingCount > 0,
                RecentAlerts = filteredAlerts,
                RecentIrrigationLogs = topRecentLogs
            };
        }
    }
}

