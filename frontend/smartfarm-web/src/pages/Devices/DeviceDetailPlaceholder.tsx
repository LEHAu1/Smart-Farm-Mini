import { useParams, useLocation } from 'react-router-dom';
import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function DeviceDetailPlaceholder() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { pathname } = useLocation();

  let subSection = 'Chi tiết thiết bị';
  if (pathname.includes('/sensors')) subSection = 'Dữ liệu cảm biến chuyên sâu';
  if (pathname.includes('/irrigation')) subSection = 'Cấu hình quy tắc & điều khiển tưới';

  return (
    <PagePlaceholder
      title={`${subSection} (Node: ${deviceId || 'Chưa chọn'})`}
      description="Không gian theo dõi chi tiết và điều khiển vi khí hậu riêng cho từng chậu cây thông minh."
    />
  );
}
