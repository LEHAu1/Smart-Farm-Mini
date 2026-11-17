import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SensorsPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_sensors', 'Cảm biến')}
      description={t('placeholder_sensors_desc', 'Giám sát chỉ số môi trường: nhiệt độ, độ ẩm đất, độ ẩm không khí.')}
    />
  );
}
