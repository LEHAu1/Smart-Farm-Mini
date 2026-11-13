export interface NavigationItem {
  path: string
  label: string
  iconName: 'dashboard' | 'devices' | 'irrigation' | 'alerts' | 'commands' | 'profile'
  badge?: number | string
}
