import { useEffect, useState } from 'react'
import { connectSensorHub } from '../services/sensor-hub'
import type {
  DeviceConnectionStatus,
  SensorHubStatus,
  SensorTelemetry,
} from '../services/sensor-hub'

export function useSensorHub(enabled: boolean) {
  const [status, setStatus] = useState<SensorHubStatus>('disconnected')
  const [telemetry, setTelemetry] = useState<SensorTelemetry | null>(null)
  const [devices, setDevices] = useState<DeviceConnectionStatus[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected')
      return
    }

    setStatus('connecting')
    return connectSensorHub({
      onTelemetry: (incoming) => {
        setTelemetry((current) => {
          if (!current) return incoming
          // A slow REST snapshot must not replace telemetry already received over SignalR.
          if (current.source === 'signalr' && incoming.source === 'database') return current
          if (current.source === 'signalr' && incoming.source === 'signalr') {
            const currentAt = current.lastUpdatedAtUtc ? Date.parse(current.lastUpdatedAtUtc) : NaN
            const incomingAt = incoming.lastUpdatedAtUtc ? Date.parse(incoming.lastUpdatedAtUtc) : NaN
            if (Number.isFinite(currentAt) && Number.isFinite(incomingAt) && incomingAt < currentAt) return current
          }
          return incoming
        })
      },
      onDeviceStatus: (updated) => {
        setDevices((current) => {
          const index = current.findIndex((device) => device.deviceId === updated.deviceId)
          if (index < 0) return [...current, updated]
          return current.map((device, itemIndex) => itemIndex === index ? updated : device)
        })
      },
      onStatus: setStatus,
    })
  }, [enabled])

  const isTelemetryStale = telemetry?.source === 'signalr'
    && (!telemetry.lastUpdatedAtUtc || now - Date.parse(telemetry.lastUpdatedAtUtc) > 120_000)
  return { status, telemetry, devices, isTelemetryStale }
}
