using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Enums
{
    public enum CommandStatus
    {
        Pending = 1,
        Acknowledged = 2,
        Completed = 3,
        Failed = 4
    }
}
