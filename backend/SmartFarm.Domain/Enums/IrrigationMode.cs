namespace SmartFarm.Domain.Enums
{
    /// <summary>
    /// Chế độ tưới tiêu của hệ thống
    /// </summary>
    public enum IrrigationMode
    {
        /// <summary>
        /// Tưới thủ công do người dùng kích hoạt
        /// </summary>
        Manual = 1,

        /// <summary>
        /// Tưới tự động dựa trên quy tắc ngưỡng độ ẩm
        /// </summary>
        Automatic = 2
    }
}
