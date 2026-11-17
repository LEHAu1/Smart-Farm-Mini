// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSensorHub } from './useSensorHub'
import type { SensorHubHandlers } from '../services/sensor-hub'

const mockConnection = vi.hoisted(() => ({
  handlers: null as SensorHubHandlers | null,
  stop: vi.fn(),
}))

vi.mock('../services/sensor-hub', () => ({
  connectSensorHub: (handlers: SensorHubHandlers) => {
    mockConnection.handlers = handlers
    return mockConnection.stop
  },
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  mockConnection.handlers = null
  mockConnection.stop.mockClear()
})

describe('useSensorHub', () => {
  it('receives telemetry and device connection updates and tracks reconnect state', () => {
    const { result, unmount } = renderHook(() => useSensorHub(true))
    expect(result.current.status).toBe('connecting')

    act(() => mockConnection.handlers?.onStatus('connected'))
    act(() => mockConnection.handlers?.onTelemetry({
      deviceId: 'device-1',
      soilMoisture: 47,
      airTemperature: 28,
      airHumidity: 60,
      waterTemperature: 24,
      waterLevel: 80,
      lastUpdatedAtUtc: new Date().toISOString(),
      source: 'signalr',
    }))
    act(() => mockConnection.handlers?.onDeviceStatus({
      deviceId: 'device-1',
      deviceCode: 'ESP32-01',
      name: 'Bộ điều khiển',
      isOnline: true,
      lastSeenAtUtc: new Date().toISOString(),
      connectionStatus: 'Online',
    }))

    expect(result.current.status).toBe('connected')
    expect(result.current.telemetry?.soilMoisture).toBe(47)
    expect(result.current.isTelemetryStale).toBe(false)
    expect(result.current.devices).toHaveLength(1)
    expect(result.current.devices[0].isOnline).toBe(true)

    act(() => mockConnection.handlers?.onStatus('reconnecting'))
    expect(result.current.status).toBe('reconnecting')
    unmount()
    expect(mockConnection.stop).toHaveBeenCalledOnce()
  })

  it('marks the last telemetry stale after two minutes without an update', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSensorHub(true))
    act(() => mockConnection.handlers?.onTelemetry({
      deviceId: 'device-1',
      soilMoisture: 47,
      airTemperature: null,
      airHumidity: null,
      waterTemperature: null,
      waterLevel: null,
      lastUpdatedAtUtc: new Date().toISOString(),
      source: 'signalr',
    }))

    expect(result.current.isTelemetryStale).toBe(false)
    vi.setSystemTime(Date.now() + 121_000)
    act(() => vi.advanceTimersByTime(121_000))
    expect(result.current.isTelemetryStale).toBe(true)
  })
})
