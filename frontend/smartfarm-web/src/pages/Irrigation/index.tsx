import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function IrrigationPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_irrigation', 'Tưới nước')}
      description={t('placeholder_irrigation_desc', 'Thiết lập ngưỡng tưới tự động, thời gian biểu và lịch tưới.')}
    />
  );
}
