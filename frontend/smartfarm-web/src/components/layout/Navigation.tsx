import { NavLink } from 'react-router-dom'
import type { NavigationItem } from '../../types/navigation'

export const navigation: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan' },
  { path: '/devices', label: 'Thiết bị' },
  { path: '/sensors', label: 'Cảm biến' },
  { path: '/irrigation', label: 'Tưới nước' },
  { path: '/alerts', label: 'Cảnh báo' },
  { path: '/history', label: 'Lịch sử' },
  { path: '/settings', label: 'Cài đặt' },
]

export default function Navigation() {
  return (
    <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-2 md:flex-col">
      {navigation.map(({ path, label }) => (
        <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
          {label}
        </NavLink>
      ))}
      <NavLink to="/login" className="nav-link">Đăng nhập</NavLink>
    </nav>
  )
}
