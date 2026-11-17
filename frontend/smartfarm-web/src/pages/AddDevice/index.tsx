import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function AddDevicePage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 05"
      title="Thêm thiết bị mới"
      route="/devices/new"
      description="Đăng ký thêm thiết bị ESP32 vào hệ thống và hướng dẫn kết nối MQTT."
      keyFeatures={[
        'Mã thiết bị (DeviceCode) chuẩn hóa',
        'Tên thiết bị & Mô tả vị trí chậu cây',
        'Hướng dẫn cài đặt Wi-Fi và nạp mã ESP32',
        'Xác thực thiết bị chưa từng được đăng ký trong hệ thống',
        'Kiểm tra tín hiệu Heartbeat kết nối thực tế',
      ]}
    />
  )
}
