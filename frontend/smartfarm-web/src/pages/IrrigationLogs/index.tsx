import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function IrrigationLogsPage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 09"
      title="Nhật ký phiên tưới"
      route="/irrigation-logs"
      description="Lịch sử chi tiết toàn bộ các phiên tưới tự động và thủ công của hệ thống."
      keyFeatures={[
        'Lọc theo thiết bị, Chế độ (Auto/Manual), Trạng thái (Thành công/Lỗi/Đang chạy)',
        'Độ ẩm trước khi tưới vs Độ ẩm sau khi tưới',
        'Thời gian bắt đầu, Kết thúc, Thời lượng tưới (Duration)',
        'Lượng nước ước tính (ml)',
        'Phân trang dữ liệu nhật ký',
      ]}
    />
  )
}
