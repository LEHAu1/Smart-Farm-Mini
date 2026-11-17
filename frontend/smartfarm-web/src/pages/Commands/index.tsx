import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function CommandsPage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 11"
      title="Lệnh điều khiển thiết bị"
      route="/commands"
      description="Lịch sử các lệnh điều khiển gửi tới ESP32 qua giao thức MQTT."
      keyFeatures={[
        'Mã lệnh điều khiển, Thiết bị nhận, Hành động (START_PUMP, STOP_PUMP)',
        'Trạng thái lệnh: Chờ xử lý (Pending), Đã nhận (Acknowledged), Hoàn thành (Completed), Thất bại (Failed)',
        'Dữ liệu gói tin Payload & Thông báo lỗi',
        'Bộ lọc theo thiết bị và trạng thái',
        'Phân trang danh sách lệnh',
      ]}
    />
  )
}
