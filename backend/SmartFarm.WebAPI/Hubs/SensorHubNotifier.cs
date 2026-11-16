using Microsoft.AspNetCore.SignalR;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.Device;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Sensor;

namespace SmartFarm.WebAPI.Hubs
{
    public sealed class SensorHubNotifier : ISensorHubNotifier
    {
        private readonly IHubContext<SensorHub> _hubContext;

        public SensorHubNotifier(IHubContext<SensorHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public Task NotifyTelemetryAsync(Guid ownerId, SensorTelemetryDto telemetry, CancellationToken cancellationToken = default) =>
            _hubContext.Clients.User(ownerId.ToString()).SendAsync("TelemetryUpdated", telemetry, cancellationToken);

        public Task NotifyCommandStatusAsync(Guid ownerId, DeviceCommandDto command, CancellationToken cancellationToken = default) =>
            _hubContext.Clients.User(ownerId.ToString()).SendAsync("CommandStatusUpdated", command, cancellationToken);

        public Task NotifyConnectionStatusAsync(Guid ownerId, DeviceConnectionStatusDto status, CancellationToken cancellationToken = default) =>
            _hubContext.Clients.User(ownerId.ToString()).SendAsync("DeviceConnectionStatusChanged", status, cancellationToken);
    }
}
