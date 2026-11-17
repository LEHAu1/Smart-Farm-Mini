import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CommandsPage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_commands', 'Lệnh điều khiển')}
      description={t('placeholder_commands_desc', 'Gửi lệnh trực tiếp đến vi điều khiển ESP32 và theo dõi ACK.')}
    />
  );
}
