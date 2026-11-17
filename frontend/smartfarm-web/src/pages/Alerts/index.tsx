import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AlertsPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_alerts', 'Cảnh báo')}
      description={t('placeholder_alerts_desc', 'Danh sách cảnh báo cảm biến vượt ngưỡng và lỗi thiết bị.')}
    />
  );
}
