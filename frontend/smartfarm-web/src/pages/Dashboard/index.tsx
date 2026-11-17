import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();

  const modules = [
    {
      title: t('module_sensor_data', 'Dữ liệu cảm biến'),
      description: t('module_sensor_desc', 'Theo dõi độ ẩm đất, nhiệt độ và độ ẩm không khí.'),
      tag: 'Dashboard · #8',
    },
    {
      title: t('module_device_ctrl', 'Điều khiển thiết bị'),
      description: t('module_device_desc', 'Điều khiển bơm, quạt và đèn với phản hồi từ thiết bị.'),
      tag: 'Control · #22',
    },
    {
      title: t('module_realtime_conn', 'Kết nối thời gian thực'),
      description: t('module_realtime_desc', 'Cập nhật dữ liệu và nhận biết khi thiết bị mất kết nối.'),
      tag: 'SignalR · #18',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">{t('dashboard_eyebrow', 'SMART FARM MINI')}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
        {t('dashboard_title', 'Tổng quan khu vườn')}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {t('dashboard_subtitle', 'Một không gian để theo dõi cây trồng và chăm sóc khu vườn mỗi ngày.')}
      </p>

      <section
        className="mt-8 overflow-hidden rounded-2xl bg-primary p-7 text-white md:p-10 shadow-lg shadow-primary/10"
        aria-labelledby="welcome-title"
      >
        <span className="rounded-full border border-white/25 px-3 py-1 text-xs">
          {t('dashboard_banner_badge', 'Nền tảng đã sẵn sàng')}
        </span>
        <h2 id="welcome-title" className="mt-6 max-w-xl text-2xl font-semibold md:text-3xl">
          {t('dashboard_banner_title', 'Bắt đầu từ một khu vườn nhỏ.')}
        </h2>
        <p className="mt-4 max-w-xl leading-7 text-white/80">
          {t(
            'dashboard_banner_desc',
            'Đây là trang tổng quan khung. Dữ liệu cảm biến và điều khiển thực tế sẽ được bổ sung khi các chức năng tương ứng được triển khai.'
          )}
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-white/90 transition-colors"
          to="/login"
        >
          {t('dashboard_banner_btn', 'Xem trang đăng nhập →')}
        </Link>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {modules.map((module) => (
          <section key={module.title} className="panel">
            <p className="eyebrow">{t('tag_unimplemented', 'CHƯA TRIỂN KHAI')}</p>
            <h2 className="mt-4 text-lg font-semibold">{module.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
            <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{module.tag}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
