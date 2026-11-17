import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navigation, { navigation } from '../components/layout/Navigation'
import { useAuth } from '../hooks/AuthContext'

export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pageTitle = navigation.find((item) => item.path === pathname)?.label ?? 'Smart Farm Mini'

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await signOut()
    } catch {
      // Local credentials are cleared even when the server cannot be reached.
    } finally {
      navigate('/login', { replace: true })
      setIsSigningOut(false)
    }
  }

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
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-muted sm:inline" title={session?.user.displayName || session?.user.userName}>
              {session?.user.displayName || session?.user.userName}
            </span>
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </header>
        <main id="main-content" className="p-6 lg:p-10"><Outlet /></main>
      </div>
    </div>
  )
}
