using SmartFarm.Application.DTOs.DeviceCommand;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện dịch vụ nghiệp vụ lệnh điều khiển thiết bị (DeviceCommand Service)
    /// </summary>
    public interface IDeviceCommandService
    {
        Task<DeviceCommandDto> CreateCommandAsync(CreateDeviceCommandRequest request, CancellationToken cancellationToken = default);
        Task<DeviceCommandDto?> GetByIdAsync(Guid commandId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<DeviceCommandDto>> GetPendingCommandsAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<DeviceCommandDto>> GetRecentCommandsAsync(Guid deviceId, int limit = 20, CancellationToken cancellationToken = default);
        Task<DeviceCommandDto> AcknowledgeCommandAsync(Guid commandId, CancellationToken cancellationToken = default);
        Task<DeviceCommandDto> CompleteCommandAsync(Guid commandId, CancellationToken cancellationToken = default);
        Task<DeviceCommandDto> FailCommandAsync(Guid commandId, string errorMessage, CancellationToken cancellationToken = default);
    }
}

