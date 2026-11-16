using Microsoft.Extensions.Logging;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Application.Contracts.Services;
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
        private readonly IMqttPublisher _mqttPublisher;
        private readonly ILogger<DeviceCommandService> _logger;

        public DeviceCommandService(
            IDeviceCommandRepository commandRepository,
            IDeviceRepository deviceRepository,
            IMqttPublisher mqttPublisher,
            ILogger<DeviceCommandService> logger)
        {
            _commandRepository = commandRepository ?? throw new ArgumentNullException(nameof(commandRepository));
            _deviceRepository = deviceRepository ?? throw new ArgumentNullException(nameof(deviceRepository));
            _mqttPublisher = mqttPublisher ?? throw new ArgumentNullException(nameof(mqttPublisher));
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

            var commandCode = $"CMD-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..6]}";

            var command = new DeviceCommand(
                request.DeviceId,
                commandCode,
                request.Action,
                DateTimeOffset.UtcNow,
                request.Payload);

            await _commandRepository.AddAsync(command, cancellationToken);
            await _commandRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã tạo lệnh {Action} ({CommandCode}) cho thiết bị {DeviceId}",
                command.Action, command.CommandCode, command.DeviceId);

            try
            {
                await _mqttPublisher.PublishCommandAsync(device.DeviceCode, MapToDto(command), cancellationToken);
            }
            catch (MqttPublishNotStartedException exception)
            {
                command.Fail("Không thể gửi lệnh tới thiết bị qua MQTT.", DateTimeOffset.UtcNow);
                await _commandRepository.UpdateAsync(command, CancellationToken.None);
                await _commandRepository.SaveChangesAsync(CancellationToken.None);
                _logger.LogError(exception,
                    "MQTT publish chưa bắt đầu cho lệnh {CommandId} tới thiết bị {DeviceId}.", command.Id, device.Id);
            }
            catch (Exception exception)
            {
                // Once the MQTT client begins publishing, an exception may mean the
                // broker accepted the QoS 1 packet but its PUBACK was lost. Keep the
                // command Pending so the hosted retry loop can safely resend by ID.
                _logger.LogError(exception,
                    "Kết quả gửi MQTT của lệnh {CommandId} không xác định; giữ Pending để thử lại.", command.Id);
            }

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
                ErrorMessage = entity.ErrorMessage
            };
        }
    }
}

