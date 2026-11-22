import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../locales/translations';
import {
  LayoutDashboard,
  Cpu,
  Gauge,
  Droplets,
  History,
  AlertTriangle,
  Terminal,
  User,
  Settings,
} from 'lucide-react';

export interface NavigationItem {
  path: string;
  key: TranslationKey;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const navigationItems: NavigationItem[] = [
  { path: '/dashboard', key: 'nav_dashboard', defaultLabel: 'Tổng quan', icon: LayoutDashboard },
  { path: '/devices', key: 'nav_devices', defaultLabel: 'Thiết bị', icon: Cpu },
  { path: '/sensors', key: 'nav_sensors', defaultLabel: 'Cảm biến', icon: Gauge },
  { path: '/irrigation', key: 'nav_irrigation', defaultLabel: 'Tưới nước', icon: Droplets },
  { path: '/irrigation-history', key: 'nav_irrigation_history', defaultLabel: 'Lịch sử tưới', icon: History },
  { path: '/alerts', key: 'nav_alerts', defaultLabel: 'Cảnh báo', icon: AlertTriangle },
  { path: '/commands', key: 'nav_commands', defaultLabel: 'Lệnh điều khiển', icon: Terminal },
  { path: '/profile', key: 'nav_profile', defaultLabel: 'Hồ sơ cá nhân', icon: User },
  { path: '/settings', key: 'nav_settings', defaultLabel: 'Cài đặt', icon: Settings },
];

export interface NavigationProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

export default function Navigation({ isCollapsed = false, onItemClick }: NavigationProps) {
  const { t } = useLanguage();

  return (
    <nav aria-label={t('nav_dashboard', 'Điều hướng chính')} className="space-y-1">
      {navigationItems.map(({ path, key, defaultLabel, icon: Icon, badge }) => {
        const label = t(key, defaultLabel);
        return (
          <NavLink
            key={path}
            to={path}
            onClick={onItemClick}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-subtle text-primary font-semibold shadow-2xs'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              } ${isCollapsed ? 'justify-center px-2' : ''}`
            }
          >
            <Icon className="size-5 shrink-0 transition-transform group-hover:scale-105" />
            {!isCollapsed && <span className="truncate">{label}</span>}
            {!isCollapsed && badge && (
              <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
