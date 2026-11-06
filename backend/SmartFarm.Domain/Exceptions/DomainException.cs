using System;

namespace SmartFarm.Domain.Exceptions
{
    /// <summary>
    /// Lớp cơ sở trừu tượng cho toàn bộ ngoại lệ thuộc Domain Layer
    /// </summary>
    public abstract class DomainException : Exception
    {
        protected DomainException()
        {
        }

        protected DomainException(string message)
            : base(message)
        {
        }

        protected DomainException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
