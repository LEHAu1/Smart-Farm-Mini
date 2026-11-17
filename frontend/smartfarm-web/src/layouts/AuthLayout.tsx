import { Outlet, Link } from 'react-router-dom'
import { Sprout, ShieldCheck } from 'lucide-react'
import { ToastProvider } from '../components/common/ToastNotification'

export function AuthLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--color-canvas,#f8faf7)] flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
        <a href="#auth-content" className="skip-link">
          Chuyển đến nội dung chính
        </a>

        {/* Minimal Auth Header */}
        <header className="w-full px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-inherit no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary,#15803d)] flex items-center justify-center text-white shadow-xs group-hover:bg-[var(--color-primary-hover,#166534)] transition-colors">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base text-[var(--color-text-main,#17251d)] tracking-tight block leading-tight">
                Smart Farm Mini
              </span>
              <span className="text-xs text-[var(--color-text-muted,#647067)] block leading-none">
                IoT Agriculture Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted,#647067)] bg-white px-3 py-1.5 rounded-full border border-[var(--color-border,#e5eae5)] shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary,#15803d)]" />
            <span>Bảo mật chuẩn JWT</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          id="auth-content"
          className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>

        {/* Minimal Auth Footer */}
        <footer className="w-full py-4 text-center text-xs text-[var(--color-text-muted,#647067)] border-t border-[var(--color-border,#e5eae5)] bg-white/60">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Smart Farm Mini. Giải pháp IoT Nông Nghiệp Thông Minh.</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-[var(--color-text-main,#17251d)] cursor-default">Bảo mật</span>
              <span className="hover:text-[var(--color-text-main,#17251d)] cursor-default">Điều khoản</span>
              <span className="hover:text-[var(--color-text-main,#17251d)] cursor-default">Hỗ trợ</span>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  )
}
