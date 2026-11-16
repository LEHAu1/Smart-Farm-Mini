using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Application.DTOs.Sensor;

namespace SmartFarm.Application.Contracts.Services
{
    public interface ISensorHubNotifier
    {
        Task NotifyTelemetryAsync(Guid ownerId, SensorTelemetryDto telemetry, CancellationToken cancellationToken = default);
        Task NotifyCommandStatusAsync(Guid ownerId, DeviceCommandDto command, CancellationToken cancellationToken = default);
        Task NotifyConnectionStatusAsync(Guid ownerId, DeviceConnectionStatusDto status, CancellationToken cancellationToken = default);
    }
}
