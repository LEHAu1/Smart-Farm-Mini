namespace SmartFarm.Application.Contracts.Services
{
    public interface IEmailService
    {
        Task SendEmailVerificationAsync(string toEmail, string userName, string verifyUrl);
        Task SendPasswordResetAsync(string toEmail, string userName, string resetUrl);
    }
}
