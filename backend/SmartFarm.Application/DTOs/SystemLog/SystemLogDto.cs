using SmartFarm.Domain.Enums;

namespace SmartFarm.Application.DTOs.SystemLog
{
    public class SystemLogDto
    {
        public Guid Id { get; init; }
        public Guid? DeviceId { get; init; }
        public LogLevel Level { get; init; }
        public string LevelName => Level.ToString();
        public LogSource Source { get; init; }
        public string SourceName => Source.ToString();
        public string EventCode { get; init; } = string.Empty;
        public string Message { get; init; } = string.Empty;
        public string? ExceptionDetails { get; init; }
        public DateTimeOffset CreatedAtUtc { get; init; }
    }

    public class CreateSystemLogRequest
    {
        public Guid? DeviceId { get; set; }
        public LogLevel Level { get; set; } = LogLevel.Information;
        public LogSource Source { get; set; } = LogSource.Backend;
        public string EventCode { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? ExceptionDetails { get; set; }
    }
}
