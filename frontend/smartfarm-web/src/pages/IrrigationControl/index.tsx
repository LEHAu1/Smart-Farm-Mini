import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function IrrigationControlPage() {
  const { deviceId } = useParams<{ deviceId: string }>()

  return (
    <PagePlaceholder
      pageNumber="PAGE 08"
      title={`Điều khiển tưới nước ${deviceId ? `(#${deviceId.slice(0, 8)})` : ''}`}
      route="/devices/:deviceId/irrigation"
      description="Quản lý quy tắc tưới tự động thông minh và nút bật/tắt máy bơm thủ công an toàn."
      keyFeatures={[
        'Trạng thái máy bơm: Đang chạy / Đang tắt kèm thời gian thực',
        'Bật/Tắt tưới thủ công kèm hộp thoại xác nhận (Confirmation Dialog)',
        'Cấu hình quy tắc tưới tự động: Ngưỡng bật, Độ ẩm mục tiêu, Thời gian tưới tối đa, Thời gian nghỉ',
        'Cảnh báo an toàn: Mực nước thấp, Cảm biến ngắt kết nối',
        'Lịch sử phiên tưới gần nhất của thiết bị',
      ]}
    />
  )
}
