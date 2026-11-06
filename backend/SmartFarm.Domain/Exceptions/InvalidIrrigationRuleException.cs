using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Exceptions
{
    public class InvalidIrrigationRuleException : DomainException
    {
        public InvalidIrrigationRuleException()
            : base("The irrigation rule is invalid.")
        {
        }

        public InvalidIrrigationRuleException(string message)
            : base(message)
        {
        }

        public InvalidIrrigationRuleException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}