using SmartFarm.Application.DTOs.DeviceCommand;

namespace SmartFarm.Application.Contracts.Services
{
    public interface IMqttPublisher
    {
        Task PublishCommandAsync(string deviceCode, DeviceCommandDto command, CancellationToken cancellationToken = default);
    }

    public sealed class MqttPublishNotStartedException : Exception
    {
        public MqttPublishNotStartedException(string message) : base(message)
        {
        }
    }
}
