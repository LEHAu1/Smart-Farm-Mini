import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function DevicesPage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 04"
      title="Quản lý thiết bị IoT"
      route="/devices"
      description="Danh sách các bộ điều khiển ESP32, trạm cảm biến và máy bơm trong nông trại."
      keyFeatures={[
        'Danh sách thiết bị dạng bảng / thẻ chi tiết',
        'Device Name, Device Code, Last Seen, Trạng thái Online/Offline',
        'Độ ẩm đất tức thời, Chế độ Auto/Manual, Trạng thái máy bơm',
        'Bộ lọc trực quan: Từ khóa, Online/Offline, Hoạt động/Vô hiệu hóa',
        'Thao tác: Thêm mới, Xem chi tiết, Chỉnh sửa, Vô hiệu hóa',
      ]}
    />
  )
}
