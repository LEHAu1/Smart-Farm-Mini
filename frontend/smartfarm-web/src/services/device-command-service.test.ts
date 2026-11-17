import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './api-client'
import { sendPumpCommand } from './device-command-service'

vi.mock('./api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('sendPumpCommand', () => {
  it('polls the command endpoint until ESP32-reported completion', async () => {
    vi.useFakeTimers()
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {
      id: 'command-1', deviceId: 'device-1', action: 'START_PUMP', status: 1, statusName: 'Pending',
    } })
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: {
        id: 'command-1', deviceId: 'device-1', action: 'START_PUMP', status: 2, statusName: 'Acknowledged',
      } })
      .mockResolvedValueOnce({ data: {
        id: 'command-1', deviceId: 'device-1', action: 'START_PUMP', status: 3, statusName: 'Completed',
      } })

    const resultPromise = sendPumpCommand('device-1', 'START_PUMP', { timeoutMs: 100, pollIntervalMs: 10 })
    await vi.advanceTimersByTimeAsync(20)
    const result = await resultPromise

    expect(apiClient.post).toHaveBeenCalledWith('/api/devices/device-1/commands', { action: 'START_PUMP' })
    expect(apiClient.get).toHaveBeenCalledWith('/api/commands/command-1')
    expect(apiClient.get).toHaveBeenCalledTimes(2)
    expect(result.command.statusName).toBe('Completed')
    expect(result.timedOut).toBe(false)
  })

  it('returns pending/acknowledged command state on timeout', async () => {
    vi.useFakeTimers()
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {
      id: 'command-2', deviceId: 'device-1', action: 'STOP_PUMP', status: 1, statusName: 'Pending',
    } })
    vi.mocked(apiClient.get).mockResolvedValue({ data: {
      id: 'command-2', deviceId: 'device-1', action: 'STOP_PUMP', status: 2, statusName: 'Acknowledged',
    } })

    const resultPromise = sendPumpCommand('device-1', 'STOP_PUMP', { timeoutMs: 20, pollIntervalMs: 10 })
    await vi.advanceTimersByTimeAsync(20)
    const result = await resultPromise
    expect(result.command.statusName).toBe('Acknowledged')
    expect(result.timedOut).toBe(true)
  })
})
