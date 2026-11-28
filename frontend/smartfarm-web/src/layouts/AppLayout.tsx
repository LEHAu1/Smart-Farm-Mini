import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Navigation';
import { AppBackgroundScene } from '../components/layout/AppBackgroundScene';
import { SylvaVariantToolbar } from '../components/layout/SylvaVariantToolbar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSensorHub } from '../hooks/useSensorHub';
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
  Sun,
  Moon,
  Languages,
  Check,
} from 'lucide-react';

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { connectionStatus } = useSensorHub();

  const getSignalRStatusDot = () => {
    switch (connectionStatus) {
      case 'connected':
        return { status: 'online' as const, label: t('signalr_connected', 'Thời gian thực: Đã kết nối') };
      case 'connecting':
        return { status: 'warning' as const, label: t('signalr_connecting', 'Thời gian thực: Đang kết nối...') };
      case 'reconnecting':
        return { status: 'warning' as const, label: t('signalr_reconnecting', 'Thời gian thực: Đang kết nối lại...') };
      default:
        return { status: 'offline' as const, label: t('signalr_disconnected', 'Thời gian thực: Mất kết nối') };
    }
  };
  const signalRStatus = getSignalRStatusDot();

  // Responsive state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('smartfarm_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Header Dropdowns state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isLangOpen, setIsLangOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Device context & notifications
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [alerts, setAlerts] = useState<AlertDto[]>([]);

  // Close menus on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsNotifOpen(false);
        setIsLangOpen(false);
        setIsMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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
    const crumbs = [{ label: t('brand_name', 'Khu vườn'), path: '/dashboard' }];

    if (segments.length === 0 || segments[0] === 'dashboard') {
      crumbs.push({ label: t('nav_dashboard', 'Tổng quan'), path: '/dashboard' });
      return crumbs;
    }

    const mapLabel: Record<string, string> = {
      devices: t('nav_devices', 'Thiết bị'),
      sensors: t('nav_sensors', 'Cảm biến'),
      irrigation: t('nav_irrigation', 'Tưới nước'),
      'irrigation-history': t('nav_irrigation_history', 'Lịch sử tưới'),
      history: t('nav_irrigation_history', 'Lịch sử tưới'),
      alerts: t('nav_alerts', 'Cảnh báo'),
      commands: t('nav_commands', 'Lệnh điều khiển'),
      profile: t('nav_profile', 'Hồ sơ cá nhân'),
      settings: t('nav_settings', 'Cài đặt'),
    };

    if (segments[0] === 'devices' && segments[1]) {
      crumbs.push({ label: t('nav_devices', 'Quản lý thiết bị'), path: '/devices' });
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
    <div className="min-h-screen bg-transparent text-ink flex relative overflow-x-hidden">
      {/* ── Full-Page 3D Living World Background (ThreeUI Sylva) ── */}
      <AppBackgroundScene />

      {/* ── Edge Vignette for Foreground Separation ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.25)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]"
        aria-hidden="true"
      />

      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>

      {/* ── 1. Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col border-r glass-bar transition-all duration-300 sticky top-0 h-screen z-30 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-line/80">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 font-bold text-primary transition-opacity ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-3d-raised shrink-0">
              <Sprout className="size-5" />
            </span>
            {!isCollapsed && (
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight block bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  {t('brand_name', 'Smart Farm')}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted block font-semibold">
                  {t('brand_tagline', 'Mini Garden')}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
              {t('management_space', 'Không gian quản lý')}
            </p>
          )}
          <Navigation isCollapsed={isCollapsed} />
        </div>

        {/* System Online Badge & Collapse Button */}
        <div className="p-3 border-t border-line space-y-2">
          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-lg bg-canvas p-2.5 text-xs">
              <StatusDot status={signalRStatus.status} label={signalRStatus.label} size="sm" />
              <button
                type="button"
                onClick={toggleSidebar}
                className="text-muted hover:text-ink p-1 rounded hover:bg-surface focus-ring"
                title={t('sidebar_collapse', 'Thu gọn sidebar')}
                aria-label={t('sidebar_collapse', 'Thu gọn thanh điều hướng')}
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2" title={signalRStatus.label}>
              <StatusDot status={signalRStatus.status} size="sm" />
              <button
                type="button"
                onClick={toggleSidebar}
                className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-canvas focus-ring"
                title={t('sidebar_expand', 'Mở rộng sidebar')}
                aria-label={t('sidebar_expand', 'Mở rộng thanh điều hướng')}
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
            className="fixed inset-y-0 left-0 w-72 glass-bar shadow-2xl flex flex-col z-50 p-4 border-r animate-in slide-in-from-left duration-200"
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
              <StatusDot status={signalRStatus.status} label={signalRStatus.label} size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Main Content Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header with Soft 3D & Glassmorphism */}
        <header className="h-16 border-b glass-bar sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-3d-flat">
          {/* Left: Mobile hamburger & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-line/70 bg-surface/60 text-muted hover:bg-surface hover:text-ink shadow-3d-flat focus-ring"
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
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Device Selector */}
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-line/80 bg-surface/60 backdrop-blur-xs px-2.5 py-1.5 text-xs shadow-3d-flat hover:shadow-3d-raised transition-all">
              <Cpu className="size-3.5 text-primary shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (e.target.value !== 'all') {
                    navigate(`/devices/${e.target.value}`);
                  }
                }}
                className="bg-transparent text-ink font-medium focus:outline-none cursor-pointer pr-1"
                aria-label={t('quick_device_select', 'Chọn thiết bị nhanh')}
              >
                <option value="all">{t('all_plants', 'Toàn bộ chậu cây')}</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.deviceCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle Button (Sáng / Tối) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-line/80 bg-surface/60 backdrop-blur-xs text-muted hover:bg-surface hover:text-ink shadow-3d-flat hover:shadow-3d-raised focus-ring transition-all"
              title={theme === 'dark' ? t('theme_light', 'Chế độ sáng') : t('theme_dark', 'Chế độ tối')}
              aria-label={t('theme_toggle', 'Chuyển đổi giao diện sáng/tối')}
            >
              {theme === 'dark' ? (
                <Sun className="size-5 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="size-5 text-slate-600 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Language Switcher Dropdown (Tiếng Việt & English) */}
            <div ref={langMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsLangOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl border border-line/80 bg-surface/60 backdrop-blur-xs text-ink hover:bg-surface focus-ring text-xs font-semibold shadow-3d-flat hover:shadow-3d-raised transition-all"
                title={t('language_select', 'Chọn ngôn ngữ')}
                aria-label={t('language_select', 'Chọn ngôn ngữ')}
                aria-expanded={isLangOpen}
              >
                <Languages className="size-3.5 text-primary" />
                <span className="uppercase font-bold tracking-wide">
                  {language === 'vi' ? 'VI' : 'EN'}
                </span>
                <ChevronDown className="size-3 text-muted" />
              </button>

              {isLangOpen && (
                <div
                  className="absolute right-0 mt-2 w-36 glass-modal rounded-2xl p-1.5 shadow-3d-floating z-50 animate-in fade-in-50 zoom-in-95"
                  role="menu"
                  aria-label={t('language_select', 'Chọn ngôn ngữ')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('vi');
                      setIsLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                      language === 'vi'
                        ? 'bg-primary-subtle text-primary font-bold'
                        : 'text-ink hover:bg-canvas'
                    }`}
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🇻🇳</span>
                      <span>{t('vietnamese', 'Tiếng Việt')}</span>
                    </span>
                    {language === 'vi' && <Check className="size-3.5 text-primary" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setIsLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                      language === 'en'
                        ? 'bg-primary-subtle text-primary font-bold'
                        : 'text-ink hover:bg-canvas'
                    }`}
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🇬🇧</span>
                      <span>{t('english', 'English')}</span>
                    </span>
                    {language === 'en' && <Check className="size-3.5 text-primary" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-xl border border-line/80 bg-surface/60 backdrop-blur-xs text-muted hover:bg-surface hover:text-ink shadow-3d-flat hover:shadow-3d-raised focus-ring transition-all"
                aria-label={`${t('notifications', 'Thông báo')} ${unreadAlerts.length > 0 ? `(${unreadAlerts.length} ${t('unread_alerts', 'chưa đọc')})` : ''}`}
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
                  className="absolute right-0 mt-2 w-80 sm:w-96 glass-modal rounded-2xl p-4 shadow-3d-floating z-50 animate-in fade-in-50 zoom-in-95"
                  role="region"
                  aria-label={t('recent_alerts', 'Hộp thông báo cảnh báo')}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      {t('recent_alerts', 'Cảnh báo gần đây')}
                    </h3>
                    <Link
                      to="/alerts"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t('view_all', 'Xem tất cả')}
                    </Link>
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {alerts.length === 0 ? (
                      <p className="text-xs text-muted text-center py-4">{t('no_alerts', 'Không có cảnh báo nào.')}</p>
                    ) : (
                      alerts.slice(0, 5).map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl p-2.5 text-xs border border-line/60 bg-canvas/60 hover:bg-canvas transition-colors"
                        >
                          <p className="font-semibold text-ink">{a.title}</p>
                          <p className="mt-0.5 text-muted line-clamp-2">{a.message}</p>
                          <p className="mt-1 text-[10px] text-muted/70">
                            {new Date(a.createdAtUtc).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
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
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-line/80 bg-surface/60 backdrop-blur-xs text-ink hover:bg-surface shadow-3d-flat hover:shadow-3d-raised focus-ring transition-all"
                aria-label={t('user_menu', 'Menu tài khoản')}
                aria-expanded={isUserMenuOpen}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary font-bold text-xs border border-primary-border/40 shadow-xs">
                  {user?.displayName?.[0]?.toUpperCase() || user?.userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <span className="font-semibold text-ink block truncate max-w-28">
                    {user?.displayName || user?.userName || t('account', 'Tài khoản')}
                  </span>
                  <span className="text-[10px] text-muted block capitalize">
                    {user?.role === 'Admin' ? t('role_admin', 'Quản trị viên') : t('role_user', 'Người dùng')}
                  </span>
                </div>
                <ChevronDown className="size-3.5 text-muted hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 glass-modal rounded-2xl p-2 shadow-3d-floating z-50 animate-in fade-in-50 zoom-in-95"
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
                    {t('profile', 'Hồ sơ cá nhân')}
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-canvas"
                    role="menuitem"
                  >
                    <Settings className="size-4 text-muted" />
                    {t('system_settings', 'Cài đặt hệ thống')}
                  </Link>

                  <div className="border-t border-line my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-subtle/50 text-left"
                    role="menuitem"
                  >
                    <LogOut className="size-4 text-danger" />
                    {t('logout', 'Đăng xuất')}
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

      {/* ── Real-time 3D Scene & Glass Toolbar (Active Across All Pages) ── */}
      <SylvaVariantToolbar />
    </div>
  );
}
