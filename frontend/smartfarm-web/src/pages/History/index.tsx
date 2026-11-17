import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HistoryPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_irrigation_history', 'Lịch sử tưới')}
      description={t('placeholder_history_desc', 'Nhật ký các lần tưới tự động và thủ công của hệ thống.')}
    />
  );
}
