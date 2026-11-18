namespace SmartFarm.Domain.Exceptions
{
    /// <summary>
    /// Ngoại lệ ném ra khi người dùng đăng nhập tài khoản Local nhưng chưa xác minh email
    /// </summary>
    public class EmailNotVerifiedException : UnauthorizedAccessException
    {
        public string ErrorCode => "EMAIL_NOT_VERIFIED";

        public EmailNotVerifiedException(string message = "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.")
            : base(message)
        {
        }
    }
}
