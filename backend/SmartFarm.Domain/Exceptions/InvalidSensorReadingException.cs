using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Exceptions
{
    public class InvalidSensorReadingException : DomainException
    {
        public InvalidSensorReadingException()
            : base("The sensor reading is invalid.")
        {
        }

        public InvalidSensorReadingException(string message)
            : base(message)
        {
        }

        public InvalidSensorReadingException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}