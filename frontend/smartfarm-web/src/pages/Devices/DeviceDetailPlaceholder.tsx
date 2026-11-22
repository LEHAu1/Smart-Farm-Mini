import { useParams, useLocation } from 'react-router-dom';
import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DeviceDetailPlaceholder() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { pathname } = useLocation();
  const { language } = useLanguage();

  let subSection = language === 'en' ? 'Device Details' : 'Chi tiết thiết bị';
  if (pathname.includes('/sensors')) {
    subSection = language === 'en' ? 'Deep Sensor Telemetry' : 'Dữ liệu cảm biến chuyên sâu';
  }
  if (pathname.includes('/irrigation')) {
    subSection = language === 'en' ? 'Irrigation Rules & Control' : 'Cấu hình quy tắc & điều khiển tưới';
  }

  const unselectedLabel = language === 'en' ? 'None' : 'Chưa chọn';
  const desc = language === 'en'
    ? 'Dedicated telemetry overview and micro-climate control for individual smart plant pots.'
    : 'Không gian theo dõi chi tiết và điều khiển vi khí hậu riêng cho từng chậu cây thông minh.';

  return (
    <PagePlaceholder
      title={`${subSection} (Node: ${deviceId || unselectedLabel})`}
      description={desc}
    />
  );
}
