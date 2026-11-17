// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPage from './index'

afterEach(cleanup)

describe('Dashboard', () => {
  it('clearly identifies sensor values and device statuses as simulated data', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('note', { name: 'Thông tin dữ liệu mô phỏng' }).textContent).toContain(
      'chưa được đọc từ cảm biến hay thiết bị thật',
    )

    const sensorSection = screen.getByRole('region', { name: 'Môi trường khu vườn' })
    for (const sensorName of [
      'Độ ẩm đất',
      'Nhiệt độ không khí',
      'Độ ẩm không khí',
      'Nhiệt độ nước',
      'Mực nước',
    ]) {
      expect(within(sensorSection).getByRole('heading', { name: sensorName })).toBeTruthy()
    }
    expect(within(sensorSection).getByText('42')).toBeTruthy()
    expect(within(sensorSection).getByText('28.4')).toBeTruthy()
    expect(within(sensorSection).getByText('68')).toBeTruthy()
    expect(within(sensorSection).getByText('25.1')).toBeTruthy()
    expect(within(sensorSection).getByText('Đủ nước')).toBeTruthy()

    const deviceSection = screen.getByRole('region', { name: /Thiết bị trong vườn/ })
    expect(within(deviceSection).getByText('Online · mô phỏng')).toBeTruthy()
    expect(within(deviceSection).getByText('Ngoại tuyến · mô phỏng')).toBeTruthy()
  })

  it('uses a single-column mobile sensor grid that expands at larger breakpoints', () => {
    const { container } = render(<DashboardPage />)
    const sensorGrid = container.querySelector('[aria-labelledby="sensor-section-title"] .grid')

    expect(sensorGrid?.className).toContain('grid-cols-1')
    expect(sensorGrid?.className).toContain('sm:grid-cols-2')
    expect(sensorGrid?.className).toContain('xl:grid-cols-3')
    expect(sensorGrid?.className).toContain('2xl:grid-cols-5')
  })
})
