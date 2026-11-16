import React from 'react';
import { NavLink } from 'react-router-dom';
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const navigationItems: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/devices', label: 'Thiết bị', icon: Cpu },
  { path: '/sensors', label: 'Cảm biến', icon: Gauge },
  { path: '/irrigation', label: 'Tưới nước', icon: Droplets },
  { path: '/irrigation-history', label: 'Lịch sử tưới', icon: History },
  { path: '/alerts', label: 'Cảnh báo', icon: AlertTriangle },
  { path: '/commands', label: 'Lệnh điều khiển', icon: Terminal },
  { path: '/profile', label: 'Hồ sơ cá nhân', icon: User },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export interface NavigationProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

export default function Navigation({ isCollapsed = false, onItemClick }: NavigationProps) {
  return (
    <nav aria-label="Điều hướng chính" className="space-y-1">
      {navigationItems.map(({ path, label, icon: Icon, badge }) => (
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
      ))}
    </nav>
  );
}
