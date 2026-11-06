import { Link, Outlet, useLocation } from 'react-router-dom'
import Navigation, { navigation } from '../components/layout/Navigation'

export default function AppLayout() {
  const { pathname } = useLocation()
  const pageTitle = navigation.find((item) => item.path === pathname)?.label ?? 'Smart Farm Mini'
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      <aside className="border-b border-line bg-white p-6 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <Link to="/dashboard" className="flex items-center gap-3 font-bold text-primary">
          <span aria-hidden="true" className="brand-icon">S</span>
          <span>Smart Farm <span className="block text-xs font-normal tracking-widest text-muted">MINI GARDEN</span></span>
        </Link>
        <p className="mt-10 mb-3 text-xs font-semibold tracking-widest text-muted">KHÔNG GIAN LÀM VIỆC</p>
        <Navigation />
        <div className="mt-8 rounded-xl bg-canvas p-4 text-sm text-muted md:absolute md:right-6 md:bottom-6 md:left-6">
          <p className="font-semibold text-primary">Khu vườn, trong tầm tay.</p>
          <p className="mt-2">Bộ khung ứng dụng · Sprint 1</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-5 lg:px-10">
          <span className="text-sm text-muted">Khu vườn của bạn / <span className="font-medium text-ink">{pageTitle}</span></span>
          <span className="badge">Chưa kết nối backend</span>
        </header>
        <main id="main-content" className="p-6 lg:p-10"><Outlet /></main>
      </div>
    </div>
  )
}
