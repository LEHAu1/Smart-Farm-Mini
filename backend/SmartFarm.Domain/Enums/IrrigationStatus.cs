namespace SmartFarm.Domain.Enums
{
    /// <summary>
    /// Trạng thái của một phiên tưới nước
    /// </summary>
    public enum IrrigationStatus
    {
        /// <summary>
        /// Đang thực hiện tưới
        /// </summary>
        InProgress = 1,

        /// <summary>
        /// Hoàn thành tưới đạt mục tiêu thành công
        /// </summary>
        Completed = 2,

        /// <summary>
        /// Bị dừng giữa chừng (do người dùng dừng hoặc kích hoạt điều kiện an toàn)
        /// </summary>
        Stopped = 3,

        /// <summary>
        /// Gặp sự cố thất bại
        /// </summary>
        Failed = 4
    }
}
