export type DashboardSensor = {
  id: string
  name: string
  value: string
  unit?: string
  detail: string
  icon: string
  accent: 'green' | 'blue' | 'amber'
  status: string
}

export type DashboardDevice = {
  id: string
  name: string
  kind: string
  status: 'Online' | 'Ngoại tuyến'
  detail: string
  initials: string
}

// Static sample values for the dashboard issue. This module intentionally has
// no API, MQTT, or hardware dependencies; these values are never live telemetry.
export const mockDashboardData = {
  updatedAt: '16/11/2026 · 08:30',
  sensors: [
    {
      id: 'soil-moisture',
      name: 'Độ ẩm đất',
      value: '42',
      unit: '%',
      detail: 'Mức ẩm tốt cho cây',
      icon: '◌',
      accent: 'blue',
      status: 'Ổn định',
    },
    {
      id: 'air-temperature',
      name: 'Nhiệt độ không khí',
      value: '28.4',
      unit: '°C',
      detail: 'Trong ngưỡng phù hợp',
      icon: '☼',
      accent: 'amber',
      status: 'Bình thường',
    },
    {
      id: 'air-humidity',
      name: 'Độ ẩm không khí',
      value: '68',
      unit: '%',
      detail: 'Độ ẩm không khí',
      icon: '≈',
      accent: 'blue',
      status: 'Ổn định',
    },
    {
      id: 'water-temperature',
      name: 'Nhiệt độ nước',
      value: '25.1',
      unit: '°C',
      detail: 'Nước tưới sẵn sàng',
      icon: '▽',
      accent: 'blue',
      status: 'Bình thường',
    },
    {
      id: 'water-level',
      name: 'Mực nước',
      value: 'Đủ nước',
      detail: 'Bình chứa còn nước',
      icon: '▤',
      accent: 'green',
      status: 'An toàn',
    },
  ] satisfies DashboardSensor[],
  devices: [
    {
      id: 'controller',
      name: 'Bộ điều khiển ESP32',
      kind: 'Bộ điều khiển trung tâm',
      status: 'Online',
      detail: 'Tín hiệu ổn định',
      initials: 'E',
    },
    {
      id: 'camera',
      name: 'Camera vườn',
      kind: 'ESP32-CAM',
      status: 'Ngoại tuyến',
      detail: 'Chưa gửi hình ảnh',
      initials: 'C',
    },
  ] satisfies DashboardDevice[],
}
