import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api-client';
import type { DeviceDto } from '../types/device';
import type { AlertDto } from '../types/alert';
import type { PageResult } from '../types/common';
import { StatusDot } from '../components/common/StatusDot';
import {
  Sprout,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  Cpu,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Responsive state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('smartfarm_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Header Dropdowns state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Device context & notifications
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [alerts, setAlerts] = useState<AlertDto[]>([]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load devices for quick selector
  useEffect(() => {
    let isMounted = true;
    async function loadQuickData() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/Devices', {
          params: { pageNumber: 1, pageSize: 50 },
        });
        if (isMounted && data?.items) {
          setDevices(data.items);
        }
      } catch {
        // Fallback for offline/demo mode
      }

      try {
        const { data: summary } = await apiClient.get('/api/Dashboard/summary');
        if (isMounted && summary?.recentAlerts) {
          setAlerts(summary.recentAlerts);
        }
      } catch {
        // Ignored
      }
    }

    loadQuickData();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('smartfarm_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  // Generate dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Khu vườn', path: '/dashboard' }];

    if (segments.length === 0 || segments[0] === 'dashboard') {
      crumbs.push({ label: 'Tổng quan', path: '/dashboard' });
      return crumbs;
    }

    const mapLabel: Record<string, string> = {
      devices: 'Thiết bị',
      sensors: 'Cảm biến',
      irrigation: 'Tưới nước',
      'irrigation-history': 'Lịch sử tưới',
      history: 'Lịch sử tưới',
      alerts: 'Cảnh báo',
      commands: 'Lệnh điều khiển',
      profile: 'Hồ sơ cá nhân',
      settings: 'Cài đặt',
    };

    if (segments[0] === 'devices' && segments[1]) {
      crumbs.push({ label: 'Quản lý thiết bị', path: '/devices' });
      const device = devices.find((d) => d.id === segments[1]);
      crumbs.push({
        label: device ? device.name : 'Chi tiết',
        path: `/devices/${segments[1]}`,
      });
      if (segments[2]) {
        crumbs.push({
          label: mapLabel[segments[2]] || segments[2],
          path: pathname,
        });
      }
    } else {
      crumbs.push({
        label: mapLabel[segments[0]] || segments[0],
        path: `/${segments[0]}`,
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadAlerts = alerts.filter((a) => !a.isResolved);

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>

      {/* ── 1. Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col border-r border-line bg-surface transition-all duration-300 sticky top-0 h-screen z-30 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-line">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 font-bold text-primary transition-opacity ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-2xs shrink-0">
              <Sprout className="size-5" />
            </span>
            {!isCollapsed && (
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight block">Smart Farm</span>
                <span className="text-[10px] uppercase tracking-widest text-muted block">Mini Garden</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
              Không gian quản lý
            </p>
          )}
          <Navigation isCollapsed={isCollapsed} />
        </div>

        {/* System Online Badge & Collapse Button */}
        <div className="p-3 border-t border-line space-y-2">
          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-lg bg-canvas p-2.5 text-xs">
              <StatusDot status="online" label="Gateway MQTT: Sẵn sàng" size="sm" />
              <button
                type="button"
                onClick={toggleSidebar}
                className="text-muted hover:text-ink p-1 rounded hover:bg-surface focus-ring"
                title="Thu gọn sidebar"
                aria-label="Thu gọn thanh điều hướng"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <StatusDot status="online" size="sm" />
              <button
                type="button"
                onClick={toggleSidebar}
                className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-canvas focus-ring"
                title="Mở rộng sidebar"
                aria-label="Mở rộng thanh điều hướng"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── 2. Mobile Drawer (< 1024px) ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            className="fixed inset-y-0 left-0 w-72 bg-surface shadow-2xl flex flex-col z-50 p-4 border-r border-line animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
          >
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3 font-bold text-primary">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
                  <Sprout className="size-5" />
                </span>
                <div>
                  <span className="text-base font-bold block">Smart Farm</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted block">Mini Garden</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:bg-canvas hover:text-ink focus-ring"
                aria-label="Đóng menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <Navigation isCollapsed={false} onItemClick={() => setIsMobileOpen(false)} />
            </div>

            <div className="border-t border-line pt-4">
              <StatusDot status="online" label="ESP32 Gateway: Online" size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Main Content Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-line bg-surface sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-canvas hover:text-ink focus-ring"
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-muted truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path + idx}>
                  {idx > 0 && <ChevronRight className="size-3.5 mx-1.5 shrink-0 text-muted/60" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-ink truncate">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="hover:text-primary hover:underline truncate">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Quick Device Selector, Notification Popover, User Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {/* Quick Device Selector */}
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs">
              <Cpu className="size-3.5 text-muted shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (e.target.value !== 'all') {
                    navigate(`/devices/${e.target.value}`);
                  }
                }}
                className="bg-transparent text-ink font-medium focus:outline-none cursor-pointer pr-1"
                aria-label="Chọn thiết bị nhanh"
              >
                <option value="all">Toàn bộ chậu cây</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.deviceCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-muted hover:bg-canvas hover:text-ink focus-ring"
                aria-label={`Thông báo ${unreadAlerts.length > 0 ? `(${unreadAlerts.length} chưa đọc)` : ''}`}
                aria-expanded={isNotifOpen}
              >
                <Bell className="size-5" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-danger">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-line bg-surface p-4 shadow-xl z-50 animate-in fade-in-50 zoom-in-95"
                  role="region"
                  aria-label="Hộp thông báo cảnh báo"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      Cảnh báo gần đây
                    </h3>
                    <Link
                      to="/alerts"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Xem tất cả
                    </Link>
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {alerts.length === 0 ? (
                      <p className="text-xs text-muted text-center py-4">Không có cảnh báo nào.</p>
                    ) : (
                      alerts.slice(0, 5).map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg p-2.5 text-xs border border-line/60 bg-canvas/60 hover:bg-canvas transition-colors"
                        >
                          <p className="font-semibold text-ink">{a.title}</p>
                          <p className="mt-0.5 text-muted line-clamp-2">{a.message}</p>
                          <p className="mt-1 text-[10px] text-muted/70">
                            {new Date(a.createdAtUtc).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg text-ink hover:bg-canvas focus-ring"
                aria-label="Menu tài khoản"
                aria-expanded={isUserMenuOpen}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary font-bold text-xs border border-primary-border/40">
                  {user?.displayName?.[0]?.toUpperCase() || user?.userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <span className="font-semibold text-ink block truncate max-w-28">
                    {user?.displayName || user?.userName || 'Tài khoản'}
                  </span>
                  <span className="text-[10px] text-muted block capitalize">{user?.role || 'User'}</span>
                </div>
                <ChevronDown className="size-3.5 text-muted hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-line mb-1">
                    <p className="text-xs font-bold text-ink truncate">{user?.displayName || user?.userName}</p>
                    <p className="text-[11px] text-muted truncate">{user?.email || 'user@smartfarm.local'}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-canvas"
                    role="menuitem"
                  >
                    <UserIcon className="size-4 text-muted" />
                    Hồ sơ cá nhân
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-canvas"
                    role="menuitem"
                  >
                    <Settings className="size-4 text-muted" />
                    Cài đặt hệ thống
                  </Link>

                  <div className="border-t border-line my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-subtle/50 text-left"
                    role="menuitem"
                  >
                    <LogOut className="size-4 text-danger" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── 4. Main Page View ── */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
