using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Application.DTOs.Common;
using SmartFarm.Domain.Enums;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Exceptions;

namespace SmartFarm.Application.Services
{
    /// <summary>
    /// Hiện thực hóa DeviceCommand Service xử lý nghiệp vụ lệnh điều khiển thiết bị
    /// </summary>
    public class DeviceCommandService : IDeviceCommandService
    {
        private static readonly HashSet<string> SupportedActions = new(StringComparer.OrdinalIgnoreCase)
        {
            "START_PUMP", "STOP_PUMP", "PUMP_ON", "PUMP_OFF", "EMERGENCY_STOP", "RESET_SYSTEM"
        };

        private readonly IDeviceCommandRepository _commandRepository;
        private readonly IDeviceRepository _deviceRepository;
        private readonly DeviceCommandQueueOptions _queueOptions;
        private readonly ILogger<DeviceCommandService> _logger;

        public DeviceCommandService(
            IDeviceCommandRepository commandRepository,
            IDeviceRepository deviceRepository,
            DeviceCommandQueueOptions queueOptions,
            ILogger<DeviceCommandService> logger)
        {
            _commandRepository = commandRepository ?? throw new ArgumentNullException(nameof(commandRepository));
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _queueOptions = queueOptions ?? throw new ArgumentNullException(nameof(queueOptions));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<DeviceCommandDto> CreateCommandAsync(
            CreateDeviceCommandRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.Action) || !SupportedActions.Contains(request.Action.Trim()))
                throw new ArgumentException("Unsupported device command action.", nameof(request.Action));

            var device = await _deviceRepository.GetByIdAsync(request.DeviceId, cancellationToken);
            if (device == null)
            {
                _logger.LogWarning("Không thể tạo lệnh: Thiết bị ID {DeviceId} không tồn tại.", request.DeviceId);
                throw new DeviceNotFoundException(request.DeviceId);
            }

            if (!device.IsActive)
                throw new InvalidOperationException("Cannot send commands to an inactive device.");

            if (!device.IsOnline)
                throw new InvalidOperationException("Cannot send commands while the device is offline.");

            var createdAtUtc = DateTimeOffset.UtcNow;
            var commandCode = $"CMD-{createdAtUtc.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..6]}";
            var expiresAtUtc = createdAtUtc.AddMinutes(Math.Clamp(_queueOptions.PendingCommandExpiryMinutes, 1, 1440));

            var command = new DeviceCommand(
                request.DeviceId,
                commandCode,
                request.Action,
                createdAtUtc,
                request.Payload,
                expiresAtUtc);

            await _commandRepository.AddAsync(command, cancellationToken);
            await _commandRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã tạo lệnh {Action} ({CommandCode}) cho thiết bị {DeviceId}",
                command.Action, command.CommandCode, command.DeviceId);

            // The hosted dispatcher is the only publisher. Persisting first makes
            // every accepted command enter the same leased queue, avoiding an API
            // publish racing with a background retry.
            return MapToDto(command);
        }

        public async Task<DeviceCommandDto?> GetByIdAsync(Guid commandId, CancellationToken cancellationToken = default)
        {
            var command = await _commandRepository.GetByIdAsync(commandId, cancellationToken);
            return command != null ? MapToDto(command) : null;
        }

        public async Task<IReadOnlyList<DeviceCommandDto>> GetPendingCommandsAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            var commands = await _commandRepository.GetPendingCommandsByDeviceIdAsync(deviceId, cancellationToken);
            return commands.Select(MapToDto).ToList();
        }

        public Task<bool> TryAcquireDispatchLeaseAsync(
            Guid commandId,
            Guid leaseOwnerId,
            DateTimeOffset nowUtc,
            DateTimeOffset leaseUntilUtc,
            DateTimeOffset deviceLastSeenCutoffUtc,
            int maxAttempts,
            CancellationToken cancellationToken = default)
        {
            if (leaseUntilUtc <= nowUtc)
                throw new ArgumentException("Dispatch lease expiry must be later than now.", nameof(leaseUntilUtc));
            if (deviceLastSeenCutoffUtc > nowUtc)
                throw new ArgumentException("Device last-seen cutoff cannot be later than now.", nameof(deviceLastSeenCutoffUtc));

            // The persistence layer evaluates eligibility and lease expiry with the
            // database clock. These values carry durations only; timestamps from
            // separate Web API hosts must not decide whether another lease expired.
            var leaseDuration = leaseUntilUtc - nowUtc;
            var deviceOfflineAfter = nowUtc - deviceLastSeenCutoffUtc;
            return _commandRepository.TryAcquireDispatchLeaseAsync(
                commandId,
                leaseOwnerId,
                leaseDuration,
                deviceOfflineAfter,
                maxAttempts,
                cancellationToken);
        }

        public Task<bool> ReleaseDispatchLeaseAsync(
            Guid commandId,
            Guid leaseOwnerId,
            CancellationToken cancellationToken = default)
        {
            return _commandRepository.ReleaseDispatchLeaseAsync(commandId, leaseOwnerId, cancellationToken);
        }

        public async Task<IReadOnlyList<DeviceCommandDto>> GetRecentCommandsAsync(Guid deviceId, int limit = 20, CancellationToken cancellationToken = default)
        {
            var commands = await _commandRepository.GetRecentByDeviceIdAsync(deviceId, limit, cancellationToken);
            return commands.Select(MapToDto).ToList();
        }

        public async Task<DeviceCommandDto> AcknowledgeCommandAsync(Guid commandId, CancellationToken cancellationToken = default)
        {
            var command = await _commandRepository.GetByIdAsync(commandId, cancellationToken);
            if (command == null)
            {
                throw new KeyNotFoundException($"Device command with ID '{commandId}' was not found.");
            }

            command.Acknowledge(DateTimeOffset.UtcNow);

            await _commandRepository.UpdateAsync(command, cancellationToken);
            await _commandRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Lệnh ID {CommandId} ({CommandCode}) đã được thiết bị tiếp nhận.", commandId, command.CommandCode);
            return MapToDto(command);
        }

        public async Task<DeviceCommandDto> CompleteCommandAsync(Guid commandId, CancellationToken cancellationToken = default)
        {
            var command = await _commandRepository.GetByIdAsync(commandId, cancellationToken);
            if (command == null)
            {
                throw new KeyNotFoundException($"Device command with ID '{commandId}' was not found.");
            }

            command.Complete(DateTimeOffset.UtcNow);

            await _commandRepository.UpdateAsync(command, cancellationToken);
            await _commandRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Lệnh ID {CommandId} ({CommandCode}) đã hoàn thành thành công.", commandId, command.CommandCode);
            return MapToDto(command);
        }

        public async Task<DeviceCommandDto> FailCommandAsync(Guid commandId, string errorMessage, CancellationToken cancellationToken = default)
        {
            var command = await _commandRepository.GetByIdAsync(commandId, cancellationToken);
            if (command == null)
            {
                throw new KeyNotFoundException($"Device command with ID '{commandId}' was not found.");
            }

            command.Fail(errorMessage, DateTimeOffset.UtcNow);

            await _commandRepository.UpdateAsync(command, cancellationToken);
            await _commandRepository.SaveChangesAsync(cancellationToken);

            _logger.LogWarning("Lệnh ID {CommandId} ({CommandCode}) thất bại: {Error}", commandId, command.CommandCode, errorMessage);
            return MapToDto(command);
        }

        public async Task<PageResult<DeviceCommandDto>> GetPagedAsync(Guid? ownerId, Guid? deviceId, CommandStatus? status, PaginationParams pagination, CancellationToken cancellationToken = default)
        {
            var page = await _commandRepository.GetPagedAsync(ownerId, deviceId, status, pagination, cancellationToken);
            return new PageResult<DeviceCommandDto>(page.Items.Select(MapToDto).ToList(), page.TotalCount, page.PageIndex, page.PageSize);
        }

        private static DeviceCommandDto MapToDto(DeviceCommand entity)
        {
            return new DeviceCommandDto
            {
                Id = entity.Id,
                DeviceId = entity.DeviceId,
                CommandCode = entity.CommandCode,
                Action = entity.Action,
                Payload = entity.Payload,
                Status = entity.Status,
                CreatedAtUtc = entity.CreatedAtUtc,
                AcknowledgedAtUtc = entity.AcknowledgedAtUtc,
                CompletedAtUtc = entity.CompletedAtUtc,
                ErrorMessage = entity.ErrorMessage,
                ExpiresAtUtc = entity.ExpiresAtUtc,
                DispatchAttemptCount = entity.DispatchAttemptCount
            };
        }
    }
}

