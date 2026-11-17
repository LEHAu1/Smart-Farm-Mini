// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PumpControl from './PumpControl'

const commandMock = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('../../services/device-command-service', () => ({
  sendPumpCommand: commandMock.send,
  getCommandStatusName: (command: { statusName?: string; status: number }) => command.statusName ?? ({ 1: 'Pending', 2: 'Acknowledged', 3: 'Completed', 4: 'Failed' } as Record<number, string>)[command.status],
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PumpControl', () => {
  it('blocks an offline device and does not submit a command', () => {
    render(<PumpControl deviceId="device-1" deviceName="ESP32-01" isOnline={false} />)
    expect(screen.getByRole('button', { name: 'Bật bơm' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/Thiết bị ngoại tuyến/)).toBeTruthy()
    expect(commandMock.send).not.toHaveBeenCalled()
  })

  it('submits only on explicit click and labels completion as ESP32-reported', async () => {
    commandMock.send.mockResolvedValueOnce({
      command: { id: 'command-1', deviceId: 'device-1', action: 'START_PUMP', status: 3, statusName: 'Completed' },
      timedOut: false,
    })
    render(<PumpControl deviceId="device-1" deviceName="ESP32-01" isOnline />)

    expect(commandMock.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Bật bơm' }))
    await waitFor(() => expect(commandMock.send).toHaveBeenCalledWith('device-1', 'START_PUMP'))
    expect(await screen.findByText(/ESP32 báo lệnh đã hoàn tất/)).toBeTruthy()
    expect(screen.getByText(/không có cảm biến xác nhận độc lập/)).toBeTruthy()
  })
})
