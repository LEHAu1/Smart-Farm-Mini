import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DevicesPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_devices', 'Thiết bị')}
      description={t('placeholder_devices_desc', 'Quản lý thiết bị ESP32 và theo dõi trạng thái kết nối.')}
    />
  );
}
