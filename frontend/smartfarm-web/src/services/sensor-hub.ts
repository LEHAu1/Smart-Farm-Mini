import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import { apiClient } from './api-client'
import { readAuthSession } from './auth-storage'
import { refreshAuthSession } from './auth-service'

export interface SensorTelemetry {
  deviceId: string
  soilMoisture: number | null
  airTemperature: number | null
  airHumidity: number | null
  waterTemperature: number | null
  waterLevel: number | null
  lastUpdatedAtUtc: string | null
  source: 'database' | 'signalr'
}

export interface DeviceConnectionStatus {
  deviceId: string
  deviceCode: string
  name: string
  isOnline: boolean
  lastSeenAtUtc: string | null
  connectionStatus: string
}

export type SensorHubStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

export interface SensorHubHandlers {
  onTelemetry: (telemetry: SensorTelemetry) => void
  onDeviceStatus: (device: DeviceConnectionStatus) => void
  onStatus: (status: SensorHubStatus) => void
}

interface DevicePage {
  items?: Array<{
    id: string
    deviceCode: string
    name: string
    isOnline: boolean
    lastSeenAtUtc: string | null
  }>
}

interface DashboardSummary {
  sensors?: {
    averageSoilMoisture?: number | null
    averageAirTemperature?: number | null
    averageAirHumidity?: number | null
    averageWaterTemperature?: number | null
    averageWaterLevel?: number | null
  }
}

export function connectSensorHub(handlers: SensorHubHandlers): () => void {
  const baseUrl = apiClient.defaults.baseURL || window.location.origin
  const hubUrl = new URL('/hubs/sensors', baseUrl).toString()
  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: async () => {
        const session = readAuthSession()
        if (!session) return ''
        if (Date.parse(session.expiresAtUtc) <= Date.now() + 30_000) {
          return (await refreshAuthSession(session.refreshToken)).accessToken
        }
        return session.accessToken
      },
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 20_000])
    .configureLogging(LogLevel.Warning)
    .build()

  let disposed = false
  let retryTimer: number | undefined

  const start = async () => {
    if (disposed || connection.state !== HubConnectionState.Disconnected) return
    handlers.onStatus('connecting')
    try {
      await connection.start()
      if (!disposed) handlers.onStatus('connected')
    } catch {
      if (disposed) return
      handlers.onStatus('reconnecting')
      scheduleRetry()
    }
  }

  const scheduleRetry = () => {
    if (disposed || retryTimer !== undefined) return
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined
      void start()
    }, 5_000)
  }

  connection.on('TelemetryUpdated', (telemetry: Omit<SensorTelemetry, 'source'>) => {
    handlers.onTelemetry({ ...telemetry, source: 'signalr' })
  })
  connection.on('DeviceConnectionStatusChanged', handlers.onDeviceStatus)
  connection.onreconnecting(() => handlers.onStatus('reconnecting'))
  connection.onreconnected(() => handlers.onStatus('connected'))
  connection.onclose(() => {
    if (!disposed) {
      handlers.onStatus('disconnected')
      scheduleRetry()
    }
  })

  void apiClient.get<DevicePage>('/api/devices', { params: { pageNumber: 1, pageSize: 100 } })
    .then(({ data }) => {
      if (!disposed) {
        for (const device of data.items ?? []) {
          handlers.onDeviceStatus({
            deviceId: device.id,
            deviceCode: device.deviceCode,
            name: device.name,
            isOnline: device.isOnline,
            lastSeenAtUtc: device.lastSeenAtUtc,
            connectionStatus: device.isOnline ? 'Online' : 'Offline',
          })
        }
      }
    })
    .catch(() => {
      // Keep the visibly labeled demo fallback when the snapshot API is unavailable.
    })

  void apiClient.get<DashboardSummary>('/api/dashboard/summary')
    .then(({ data }) => {
      if (disposed || !data.sensors) return
      handlers.onTelemetry({
        deviceId: 'dashboard-summary',
        soilMoisture: data.sensors.averageSoilMoisture ?? null,
        airTemperature: data.sensors.averageAirTemperature ?? null,
        airHumidity: data.sensors.averageAirHumidity ?? null,
        waterTemperature: data.sensors.averageWaterTemperature ?? null,
        waterLevel: data.sensors.averageWaterLevel ?? null,
        // The summary endpoint does not expose the newest reading timestamp.
        lastUpdatedAtUtc: null,
        source: 'database',
      })
    })
    .catch(() => {
      // Keep the visibly labeled demo fallback when the persisted summary is unavailable.
    })

  void start()

  return () => {
    disposed = true
    if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    if (connection.state !== HubConnectionState.Disconnected) void connection.stop()
  }
}
