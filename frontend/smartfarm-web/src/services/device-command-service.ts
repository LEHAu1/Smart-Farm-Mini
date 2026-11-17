import { apiClient } from './api-client'

export type PumpCommandAction = 'START_PUMP' | 'STOP_PUMP'
export type DeviceCommandStatusName = 'Pending' | 'Acknowledged' | 'Completed' | 'Failed'

export interface DeviceCommandResult {
  id: string
  deviceId: string
  action: string
  status: number
  statusName?: DeviceCommandStatusName
  errorMessage?: string | null
}

export interface TrackedDeviceCommand {
  command: DeviceCommandResult
  timedOut: boolean
}

const statusNames: Record<number, DeviceCommandStatusName> = {
  1: 'Pending',
  2: 'Acknowledged',
  3: 'Completed',
  4: 'Failed',
}

export function getCommandStatusName(command: DeviceCommandResult): DeviceCommandStatusName {
  return command.statusName ?? statusNames[command.status] ?? 'Pending'
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function sendPumpCommand(
  deviceId: string,
  action: PumpCommandAction,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<TrackedDeviceCommand> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const pollIntervalMs = options.pollIntervalMs ?? 1_000
  const { data: created } = await apiClient.post<DeviceCommandResult>(
    `/api/devices/${deviceId}/commands`,
    { action },
  )

  let command = created
  if (getCommandStatusName(command) === 'Completed' || getCommandStatusName(command) === 'Failed') {
    return { command, timedOut: false }
  }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await wait(Math.min(pollIntervalMs, deadline - Date.now()))
    const { data } = await apiClient.get<DeviceCommandResult>(`/api/commands/${command.id}`)
    command = data
    if (getCommandStatusName(command) === 'Completed' || getCommandStatusName(command) === 'Failed') {
      return { command, timedOut: false }
    }
  }

  return { command, timedOut: true }
}
