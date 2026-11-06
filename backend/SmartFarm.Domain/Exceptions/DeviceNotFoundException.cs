using System;

namespace SmartFarm.Domain.Exceptions
{
    /// <summary>
    /// Ngoại lệ khi không tìm thấy thiết bị trong hệ thống
    /// </summary>
    public class DeviceNotFoundException : DomainException
    {
        public DeviceNotFoundException()
            : base("Device was not found.")
        {
        }

        public DeviceNotFoundException(Guid deviceId)
            : base($"Device with ID '{deviceId}' was not found.")
        {
        }

        public DeviceNotFoundException(string message)
            : base(message)
        {
        }

        public DeviceNotFoundException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
