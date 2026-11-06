using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Exceptions
{
    public class IrrigationSafetyException : DomainException
    {
        public IrrigationSafetyException()
            : base("The irrigation operation violates safety rules.")
        {
        }

        public IrrigationSafetyException(string message)
            : base(message)
        {
        }

        public IrrigationSafetyException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}