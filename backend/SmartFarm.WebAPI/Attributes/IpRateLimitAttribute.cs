using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SmartFarm.WebAPI.Attributes
{
    /// <summary>
    /// Giới hạn số lượng request theo địa chỉ IP để chống lạm dụng (Rate Limiting)
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    public class IpRateLimitAttribute : ActionFilterAttribute
    {
        private readonly int _maxRequests;
        private readonly TimeSpan _window;
        private static readonly ConcurrentDictionary<string, ConcurrentQueue<DateTimeOffset>> _requestHistory = new();

        public IpRateLimitAttribute(int maxRequests = 3, int windowSeconds = 60)
        {
            _maxRequests = maxRequests;
            _window = TimeSpan.FromSeconds(windowSeconds);
        }

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var ip = GetClientIp(context.HttpContext);
            var route = context.ActionDescriptor.DisplayName ?? "unknown";
            var key = $"{ip}:{route}";

            var now = DateTimeOffset.UtcNow;
            var history = _requestHistory.GetOrAdd(key, _ => new ConcurrentQueue<DateTimeOffset>());

            // Dọn dẹp các mốc thời gian ngoài cửa sổ trượt
            while (history.TryPeek(out var timestamp) && now - timestamp > _window)
            {
                history.TryDequeue(out _);
            }

            if (history.Count >= _maxRequests)
            {
                context.Result = new ObjectResult(new
                {
                    status = 429,
                    error = "Bạn đã gửi yêu cầu quá thường xuyên. Vui lòng thử lại sau ít phút.",
                    timestampUtc = now
                })
                {
                    StatusCode = 429
                };
                return;
            }

            history.Enqueue(now);
            base.OnActionExecuting(context);
        }

        private static string GetClientIp(HttpContext httpContext)
        {
            if (httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
            {
                var ips = forwardedFor.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (ips.Length > 0)
                {
                    return ips[0].Trim();
                }
            }

            return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
