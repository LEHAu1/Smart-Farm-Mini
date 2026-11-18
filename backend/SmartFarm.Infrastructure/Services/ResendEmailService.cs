using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Common.Configurations;
using SmartFarm.Application.Contracts.Services;

namespace SmartFarm.Infrastructure.Services
{
    public class ResendEmailService : IEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly ResendSettings _settings;
        private readonly ILogger<ResendEmailService> _logger;

        public ResendEmailService(
            HttpClient httpClient,
            IOptions<ResendSettings> options,
            ILogger<ResendEmailService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _settings = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task SendEmailVerificationAsync(string toEmail, string userName, string verifyUrl)
        {
            var subject = "Xác minh tài khoản Smart Farm Mini";
            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .brand {{ color: #16a34a; font-size: 24px; font-weight: 700; }}
        .btn {{ display: inline-block; background-color: #16a34a; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }}
        .footer {{ margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <div class=""brand"">🌱 Smart Farm Mini</div>
        </div>
        <p>Xin chào <strong>{userName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Smart Farm Mini</strong>. Vui lòng bấm vào nút bên dưới để xác minh địa chỉ email của bạn:</p>
        <div style=""text-align: center;"">
            <a href=""{verifyUrl}"" class=""btn"" target=""_blank"">Xác minh email ngay</a>
        </div>
        <p style=""font-size: 13px; color: #64748b;"">Nếu nút trên không hoạt động, bạn có thể sao chép liên kết này vào trình duyệt:<br/><span style=""word-break: break-all; color: #2563eb;"">{verifyUrl}</span></p>
        <p style=""font-size: 13px; color: #64748b;"">Liên kết này sẽ hết hạn trong vòng 24 giờ. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email.</p>
        <div class=""footer"">
            © {DateTime.UtcNow.Year} Smart Farm Mini. All rights reserved.
        </div>
    </div>
</body>
</html>";

            await SendEmailInternalAsync(toEmail, subject, html);
        }

        public async Task SendPasswordResetAsync(string toEmail, string userName, string resetUrl)
        {
            var subject = "Đặt lại mật khẩu Smart Farm Mini";
            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .brand {{ color: #16a34a; font-size: 24px; font-weight: 700; }}
        .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }}
        .footer {{ margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <div class=""brand"">🌱 Smart Farm Mini</div>
        </div>
        <p>Xin chào <strong>{userName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này. Vui lòng bấm vào nút bên dưới để thiết lập mật khẩu mới:</p>
        <div style=""text-align: center;"">
            <a href=""{resetUrl}"" class=""btn"" target=""_blank"">Đặt lại mật khẩu</a>
        </div>
        <p style=""font-size: 13px; color: #64748b;"">Nếu nút trên không hoạt động, bạn có thể sao chép liên kết này vào trình duyệt:<br/><span style=""word-break: break-all; color: #2563eb;"">{resetUrl}</span></p>
        <p style=""font-size: 13px; color: #64748b;"">Vì lý do an toàn, liên kết này có hiệu lực trong thời gian giới hạn và chỉ dùng được một lần. Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể yên tâm bỏ qua email này.</p>
        <div class=""footer"">
            © {DateTime.UtcNow.Year} Smart Farm Mini. All rights reserved.
        </div>
    </div>
</body>
</html>";

            await SendEmailInternalAsync(toEmail, subject, html);
        }

        private async Task SendEmailInternalAsync(string toEmail, string subject, string htmlContent)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                _logger.LogWarning("Resend:ApiKey chưa được cấu hình. Bỏ qua việc gửi email tới {ToEmail}.", toEmail);
                return;
            }

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

                var sender = string.IsNullOrWhiteSpace(_settings.FromName)
                    ? _settings.FromEmail
                    : $"{_settings.FromName} <{_settings.FromEmail}>";

                var payload = new
                {
                    from = sender,
                    to = new[] { toEmail },
                    subject = subject,
                    html = htmlContent
                };

                request.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    // Bảo vệ token: Không ghi log nội dung email hoặc token
                    _logger.LogError("Gửi email qua Resend thất bại với StatusCode: {StatusCode}. Lỗi: {Error}",
                        response.StatusCode, errorBody);
                }
                else
                {
                    _logger.LogInformation("Đã gửi email thành công tới {ToEmail} với tiêu đề '{Subject}'.", toEmail, subject);
                }
            }
            catch (Exception ex)
            {
                // Không throw exception để luồng chính không bị gián đoạn
                _logger.LogError(ex, "Lỗi kết nối khi gửi email qua Resend tới {ToEmail}.", toEmail);
            }
        }
    }
}
