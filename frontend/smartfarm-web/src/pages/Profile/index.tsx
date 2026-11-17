import PagePlaceholder from '../../components/common/PagePlaceholder';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfilePage() {
  const { t } = useLanguage();
  return (
    <PagePlaceholder
      title={t('nav_profile', 'Hồ sơ cá nhân')}
      description={t('placeholder_profile_desc', 'Quản lý thông tin tài khoản cá nhân và đổi mật khẩu.')}
    />
  );
}
