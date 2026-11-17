// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectSensorHub } from './sensor-hub'
import type { SensorHubHandlers } from './sensor-hub'

const signalR = vi.hoisted(() => {
  const connection = {
    state: 'Disconnected',
    on: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
    start: vi.fn(async () => { connection.state = 'Connected' }),
    stop: vi.fn(async () => { connection.state = 'Disconnected' }),
  }
  return {
    connection,
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    configureLogging: vi.fn(),
    readSession: vi.fn(() => ({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1', userName: 'grower', email: 'grower@example.test', role: 'User' },
    })),
    refreshSession: vi.fn(async () => ({ accessToken: 'rotated-jwt', refreshToken: 'rotated-refresh', expiresAtUtc: new Date(Date.now() + 60_000).toISOString(), user: { id: 'user-1', userName: 'grower', email: 'grower@example.test', role: 'User' } })),
    apiGet: vi.fn(async (path: string): Promise<{ data: unknown }> => path === '/api/devices'
      ? { data: { items: [] } }
      : { data: { sensors: {} } }),
  }
})

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) { signalR.withUrl(...args); return this }
    withAutomaticReconnect(...args: unknown[]) { signalR.withAutomaticReconnect(...args); return this }
    configureLogging(...args: unknown[]) { signalR.configureLogging(...args); return this }
    build() { return signalR.connection }
  },
  HubConnectionState: { Disconnected: 'Disconnected' },
  LogLevel: { Warning: 3 },
}))

vi.mock('./auth-storage', () => ({ readAuthSession: signalR.readSession }))
vi.mock('./auth-service', () => ({ refreshAuthSession: signalR.refreshSession }))
vi.mock('./api-client', () => ({ apiClient: { defaults: { baseURL: 'http://localhost:5205' }, get: signalR.apiGet } }))

afterEach(() => {
  vi.clearAllMocks()
  signalR.connection.state = 'Disconnected'
  vi.useRealTimers()
})

describe('connectSensorHub', () => {
  it('connects to the authenticated hub, registers its events and reports reconnect state', async () => {
    const handlers: SensorHubHandlers = {
      onTelemetry: vi.fn(),
      onDeviceStatus: vi.fn(),
      onStatus: vi.fn(),
    }
    const disconnect = connectSensorHub(handlers)
    await Promise.resolve()

    expect(signalR.withUrl).toHaveBeenCalledWith(
      expect.stringMatching(/\/hubs\/sensors$/),
      expect.objectContaining({ accessTokenFactory: expect.any(Function) }),
    )
    expect(await signalR.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('jwt-token')
    expect(signalR.withAutomaticReconnect).toHaveBeenCalledOnce()
    expect(signalR.connection.on).toHaveBeenCalledWith('TelemetryUpdated', expect.any(Function))
    expect(signalR.connection.on).toHaveBeenCalledWith('DeviceConnectionStatusChanged', handlers.onDeviceStatus)
    expect(handlers.onStatus).toHaveBeenCalledWith('connected')

    signalR.connection.onreconnecting.mock.calls[0][0]()
    expect(handlers.onStatus).toHaveBeenCalledWith('reconnecting')
    disconnect()
    expect(signalR.connection.stop).toHaveBeenCalledOnce()
  })

  it('refreshes an expired session before negotiating the hub connection', async () => {
    signalR.readSession.mockReturnValue({
      accessToken: 'expired-jwt',
      refreshToken: 'refresh-token',
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
      user: { id: 'user-1', userName: 'grower', email: 'grower@example.test', role: 'User' },
    })
    const disconnect = connectSensorHub({
      onTelemetry: vi.fn(),
      onDeviceStatus: vi.fn(),
      onStatus: vi.fn(),
    })
    const options = signalR.withUrl.mock.calls[0][1]

    expect(await options.accessTokenFactory()).toBe('rotated-jwt')
    expect(signalR.refreshSession).toHaveBeenCalledWith('refresh-token')
    disconnect()
  })

  it('loads the current device status snapshot before waiting for realtime changes', async () => {
    const currentDevice = {
      id: 'device-1',
      deviceCode: 'ESP32-01',
      name: 'Bộ điều khiển',
      isOnline: true,
      lastSeenAtUtc: new Date().toISOString(),
    }
    signalR.apiGet.mockResolvedValueOnce({ data: { items: [currentDevice] } })
    const handlers: SensorHubHandlers = {
      onTelemetry: vi.fn(),
      onDeviceStatus: vi.fn(),
      onStatus: vi.fn(),
    }

    const disconnect = connectSensorHub(handlers)
    await Promise.resolve()
    await Promise.resolve()

    expect(signalR.apiGet).toHaveBeenCalledWith('/api/devices', { params: { pageNumber: 1, pageSize: 100 } })
    expect(handlers.onDeviceStatus).toHaveBeenCalledWith({
      deviceId: currentDevice.id,
      deviceCode: currentDevice.deviceCode,
      name: currentDevice.name,
      isOnline: currentDevice.isOnline,
      lastSeenAtUtc: currentDevice.lastSeenAtUtc,
      connectionStatus: 'Online',
    })
    expect(signalR.apiGet).toHaveBeenCalledWith('/api/dashboard/summary')
    disconnect()
  })

  it('loads persisted sensor averages as database data and realtime events as SignalR data', async () => {
    signalR.apiGet.mockImplementation(async (path: string) => path === '/api/devices'
      ? { data: { items: [] } }
      : { data: { sensors: {
          averageSoilMoisture: 34,
          averageAirTemperature: 23.4,
          averageAirHumidity: 77,
          averageWaterTemperature: null,
          averageWaterLevel: 62,
        } } })
    const handlers: SensorHubHandlers = {
      onTelemetry: vi.fn(),
      onDeviceStatus: vi.fn(),
      onStatus: vi.fn(),
    }

    const disconnect = connectSensorHub(handlers)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(handlers.onTelemetry).toHaveBeenCalledWith(expect.objectContaining({
      soilMoisture: 34,
      airTemperature: 23.4,
      airHumidity: 77,
      waterLevel: 62,
      source: 'database',
      lastUpdatedAtUtc: null,
    }))
    const realtimeHandler = signalR.connection.on.mock.calls.find(([event]) => event === 'TelemetryUpdated')?.[1]
    realtimeHandler?.({ deviceId: 'device-1', soilMoisture: 35, lastUpdatedAtUtc: new Date().toISOString() })
    expect(handlers.onTelemetry).toHaveBeenLastCalledWith(expect.objectContaining({
      soilMoisture: 35,
      source: 'signalr',
    }))
    disconnect()
  })

  it('retries an initial connection failure and cancels pending retry on cleanup', async () => {
    vi.useFakeTimers()
    signalR.connection.start
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValueOnce()
    const handlers: SensorHubHandlers = {
      onTelemetry: vi.fn(),
      onDeviceStatus: vi.fn(),
      onStatus: vi.fn(),
    }
    const disconnect = connectSensorHub(handlers)
    await Promise.resolve()
    await Promise.resolve()
    expect(handlers.onStatus).toHaveBeenCalledWith('reconnecting')

    await vi.advanceTimersByTimeAsync(5_000)
    expect(signalR.connection.start).toHaveBeenCalledTimes(2)
    expect(handlers.onStatus).toHaveBeenCalledWith('connected')
    disconnect()
  })
})
