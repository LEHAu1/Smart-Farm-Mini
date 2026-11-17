import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_settings', 'Cài đặt')}
      description={t('placeholder_settings_desc', 'Cấu hình thông số hệ thống, MQTT Broker và các chính sách vận hành.')}
    />
  );
}
