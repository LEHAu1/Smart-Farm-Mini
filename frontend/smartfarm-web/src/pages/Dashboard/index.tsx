import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function DashboardPage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 03"
      title="Dashboard Tổng quan Farm"
      route="/dashboard"
      description="Trung tâm điều hành và giám sát toàn bộ hiện trạng nông trại thông minh."
      keyFeatures={[
        'Tổng quan thiết bị: Tổng số, Online, Offline, Đang tưới',
        'Tổng quan cảm biến: Độ ẩm đất TB, Nhiệt độ khí, Độ ẩm khí, Nhiệt độ nước, Mực nước',
        'Biểu đồ thời gian thực độ ẩm đất & nhiệt độ',
        'Trạng thái máy bơm & quy tắc tưới tự động',
        'Danh sách cảnh báo mới nhất chưa xử lý',
        'Nhật ký các phiên tưới gần nhất',
      ]}
    />
  )
}
