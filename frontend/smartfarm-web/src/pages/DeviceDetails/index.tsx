import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function DeviceDetailsPage() {
  const { deviceId } = useParams<{ deviceId: string }>()

  return (
    <PagePlaceholder
      pageNumber="PAGE 06"
      title={`Chi tiết thiết bị ${deviceId ? `(#${deviceId.slice(0, 8)})` : ''}`}
      route="/devices/:deviceId"
      description="Xem chi tiết các chỉ số cảm biến, máy bơm và tình trạng kết nối của thiết bị."
      keyFeatures={[
        'Thông tin phần cứng: DeviceCode, MAC, Firmware version, Last Seen',
        'Bộ 5 chỉ số cảm biến hiện tại (Độ ẩm đất, Nhiệt độ khí, Độ ẩm khí, Nhiệt độ nước, Mực nước)',
        'Trạng thái máy bơm & phiên tưới hiện tại',
        'Các cảnh báo mới nhất của thiết bị',
        'Điều hướng nhanh: Lịch sử cảm biến, Điều khiển tưới',
      ]}
    />
  )
}
