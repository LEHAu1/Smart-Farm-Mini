import { NavLink } from 'react-router-dom'
import type { NavigationItem } from '../../types/navigation'

export const navigation: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan', iconName: 'dashboard' },
  { path: '/devices', label: 'Thiết bị', iconName: 'devices' },
  { path: '/irrigation-logs', label: 'Lịch sử tưới', iconName: 'irrigation' },
  { path: '/alerts', label: 'Cảnh báo', iconName: 'alerts' },
  { path: '/commands', label: 'Lệnh điều khiển', iconName: 'commands' },
  { path: '/profile', label: 'Tài khoản', iconName: 'profile' },
]

export default function Navigation() {
  return (
    <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-2 md:flex-col">
      {navigation.map(({ path, label }) => (
        <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
