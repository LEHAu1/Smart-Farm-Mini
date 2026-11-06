using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Enums
{

    public enum AlertType
    {
        DeviceOffline = 1,
        SensorError = 2,
        LowSoilMoisture = 3,
        LowWaterLevel = 4,
        WaterTemperatureHigh = 5,
        IrrigationFailed = 6,
        IrrigationTimeout = 7,
        SystemError = 8
    }
}
