import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User as UserIcon, LogOut, ChevronRight } from 'lucide-react'
import { StatusIndicator } from '../common/StatusIndicator'

interface HeaderProps {
  onOpenMobileMenu: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate breadcrumb items from current path
  const getBreadcrumbs = () => {
    const path = location.pathname
    if (path === '/dashboard') return [{ label: 'Tổng quan' }]
    if (path === '/devices') return [{ label: 'Thiết bị' }]
    if (path === '/devices/new')
      return [
        { label: 'Thiết bị', href: '/devices' },
        { label: 'Thêm thiết bị mới' },
      ]
    if (path.startsWith('/devices/') && path.endsWith('/sensors'))
      return [
        { label: 'Thiết bị', href: '/devices' },
        { label: 'Lịch sử cảm biến' },
      ]
    if (path.startsWith('/devices/') && path.endsWith('/irrigation'))
      return [
        { label: 'Thiết bị', href: '/devices' },
        { label: 'Điều khiển tưới' },
      ]
    if (path.startsWith('/devices/'))
      return [
        { label: 'Thiết bị', href: '/devices' },
        { label: 'Chi tiết thiết bị' },
      ]
    if (path === '/irrigation-logs') return [{ label: 'Lịch sử tưới' }]
    if (path === '/alerts') return [{ label: 'Cảnh báo' }]
    if (path === '/commands') return [{ label: 'Lệnh điều khiển' }]
    if (path === '/profile') return [{ label: 'Tài khoản cá nhân' }]
    return [{ label: 'Trang chủ' }]
  }

  const breadcrumbs = getBreadcrumbs()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <header className="h-16 px-4 md:px-8 border-b border-[#e5eae5] bg-white flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden text-[#647067] hover:text-[#17251d] p-1.5 rounded-md hover:bg-[#f1f5f1] cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Breadcrumb nav */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#647067] min-w-0">
          <Link
            to="/dashboard"
            className="hover:text-[#17251d] transition-colors shrink-0"
          >
            Trang chủ
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="size-3.5 text-[#8a968d] shrink-0" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-[#17251d] transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-[#17251d] truncate">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right side: Status indicator + Notifications + User Avatar */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className="hidden sm:flex items-center px-2.5 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0]">
          <StatusIndicator status="online" size="sm" showPulse label="IoT Trực tuyến" />
        </div>

        {/* Alerts Bell */}
        <Link
          to="/alerts"
          className="relative text-[#647067] hover:text-[#17251d] p-2 rounded-lg hover:bg-[#f1f5f1] transition-colors"
          aria-label="Cảnh báo hệ thống"
          title="Xem cảnh báo"
        >
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#dc2626]" />
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#f1f5f1] transition-colors cursor-pointer select-none"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="size-8 rounded-full bg-[#15803d] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AD
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#17251d] leading-none">
                Chủ nông trại
              </span>
              <span className="text-[10px] text-[#647067] leading-none mt-1">
                farm@smartfarm.vn
              </span>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#e5eae5] bg-white p-1.5 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[#f0f3f0] mb-1">
                <p className="text-xs font-semibold text-[#17251d]">
                  Chủ nông trại
                </p>
                <p className="text-[11px] text-[#647067] truncate">
                  farm@smartfarm.vn
                </p>
              </div>

              <Link
                to="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#17251d] rounded-lg hover:bg-[#f1f5f1] transition-colors"
              >
                <UserIcon className="size-4 text-[#647067]" />
                <span>Hồ sơ cá nhân</span>
              </Link>

              <div className="my-1 border-t border-[#f0f3f0]" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#dc2626] rounded-lg hover:bg-[#fef2f2] transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
