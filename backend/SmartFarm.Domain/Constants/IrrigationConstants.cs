using System;
using System.Collections.Generic;
using System.Text;

namespace SmartFarm.Domain.Constants
{
    public static class IrrigationConstants
    {
        // Độ ẩm đất hợp lệ (%)
        public const decimal MinSoilMoisture = 0m;
        public const decimal MaxSoilMoisture = 100m;

        // Thời gian tưới tối thiểu (giây)
        public const int MinIrrigationDurationSeconds = 1;

        // Lượng nước hợp lệ (ml)
        public const decimal MinWaterAmountMl = 0m;
    }
}