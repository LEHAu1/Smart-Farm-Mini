import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function AlertsPage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 10"
      title="Cảnh báo hệ thống"
      route="/alerts"
      description="Trung tâm quản lý các sự cố, cảnh báo độ ẩm thấp, mực nước cạn và lỗi kết nối."
      keyFeatures={[
        'Phân cấp mức độ sự cố: Nghiêm trọng (Critical), Cảnh báo (Warning), Thông tin (Info)',
        'Lọc theo trạng thái: Chưa xử lý (Unresolved) vs Đã giải quyết (Resolved)',
        'Thao tác: Đánh dấu đã xử lý cảnh báo, Giải quyết tất cả',
        'Chi tiết thông báo: Tên thiết bị, Mã lỗi, Thời gian phát sinh',
        'Phân trang danh sách cảnh báo',
      ]}
    />
  )
}
