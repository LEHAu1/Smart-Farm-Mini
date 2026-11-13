import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  Droplets,
  AlertTriangle,
  Terminal,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Sprout,
  X,
} from 'lucide-react'
import type { NavigationItem } from '../../types/navigation'

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan', iconName: 'dashboard' },
  { path: '/devices', label: 'Thiết bị', iconName: 'devices' },
  { path: '/irrigation-logs', label: 'Lịch sử tưới', iconName: 'irrigation' },
  { path: '/alerts', label: 'Cảnh báo', iconName: 'alerts' },
  { path: '/commands', label: 'Lệnh điều khiển', iconName: 'commands' },
  { path: '/profile', label: 'Tài khoản', iconName: 'profile' },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const getIcon = (iconName: NavigationItem['iconName']) => {
    switch (iconName) {
      case 'dashboard':
        return <LayoutDashboard className="size-5 shrink-0" />
      case 'devices':
        return <Cpu className="size-5 shrink-0" />
      case 'irrigation':
        return <Droplets className="size-5 shrink-0" />
      case 'alerts':
        return <AlertTriangle className="size-5 shrink-0" />
      case 'commands':
        return <Terminal className="size-5 shrink-0" />
      case 'profile':
        return <User className="size-5 shrink-0" />
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#e5eae5]">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#f0f3f0]">
        <Link
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden font-bold text-[#15803d]"
        >
          <div className="size-9 rounded-lg bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sprout className="size-5" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-[#17251d] leading-none">
                Smart Farm
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#15803d] uppercase mt-0.5">
                MINI IOT
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden text-[#647067] hover:text-[#17251d] p-1.5 rounded-md hover:bg-[#f1f5f1] cursor-pointer"
          aria-label="Đóng menu"
        >
          <X className="size-5" />
        </button>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex text-[#647067] hover:text-[#17251d] p-1.5 rounded-md hover:bg-[#f1f5f1] cursor-pointer transition-colors"
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4.5" />
          ) : (
            <PanelLeftClose className="size-4.5" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <nav aria-label="Điều hướng hệ thống" className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            title={isCollapsed && !isMobileOpen ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#f0fdf4] text-[#15803d] font-semibold border-l-2 border-[#15803d]'
                  : 'text-[#647067] hover:bg-[#f8faf7] hover:text-[#17251d]'
              } ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`
            }
          >
            {getIcon(item.iconName)}
            {(!isCollapsed || isMobileOpen) && (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info Box */}
      {(!isCollapsed || isMobileOpen) && (
        <div className="p-3 border-t border-[#f0f3f0]">
          <div className="rounded-lg bg-[#f8faf7] p-3 border border-[#e5eae5]/80">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-xs font-semibold text-[#17251d]">
                Hệ thống IoT
              </span>
            </div>
            <p className="text-[11px] text-[#647067] mt-1">
              Bảo vệ & Giám sát nông trại
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-200 z-30 ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs animate-in fade-in duration-150"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 md:hidden transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}

