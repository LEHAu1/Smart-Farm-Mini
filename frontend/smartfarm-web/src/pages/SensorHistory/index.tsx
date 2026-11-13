import { useParams } from 'react-router-dom'
import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function SensorHistoryPage() {
  const { deviceId } = useParams<{ deviceId: string }>()

  return (
    <PagePlaceholder
      pageNumber="PAGE 07"
      title={`Lịch sử cảm biến ${deviceId ? `(#${deviceId.slice(0, 8)})` : ''}`}
      route="/devices/:deviceId/sensors"
      description="Biểu đồ phân tích chuyên sâu các chỉ số cảm biến theo thời gian thực và theo giờ."
      keyFeatures={[
        'Bộ chọn loại cảm biến: Độ ẩm đất, Nhiệt độ khí, Độ ẩm khí, Nhiệt độ nước, Mực nước',
        'Bộ lọc khoảng thời gian: Hôm nay, 7 ngày, 30 ngày, Tùy chỉnh (From - To)',
        'Thống kê Min, Max, Trung bình (Avg) chính xác',
        'Biểu đồ đường (Line chart) tương tác có tooltip',
        'Bảng dữ liệu lịch sử chi tiết có phân trang',
      ]}
    />
  )
}
