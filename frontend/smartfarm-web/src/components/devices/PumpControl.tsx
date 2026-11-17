import { useState } from 'react'
import {
  getCommandStatusName,
  sendPumpCommand,
  type DeviceCommandResult,
  type PumpCommandAction,
} from '../../services/device-command-service'

interface PumpControlProps {
  deviceId: string
  deviceName: string
  isOnline: boolean
}

function resultMessage(command: DeviceCommandResult, timedOut: boolean): string {
  if (timedOut) {
    if (getCommandStatusName(command) === 'Acknowledged') {
      return `ESP32 đã xác nhận nhận lệnh nhưng chưa gửi kết quả cuối. Trạng thái bơm thực tế chưa được đo độc lập. Mã lệnh: ${command.id}.`
    }
    return `Chưa nhận được kết quả cuối cùng. Mã lệnh: ${command.id}.`
  }

  switch (getCommandStatusName(command)) {
    case 'Acknowledged':
      return 'ESP32 đã xác nhận nhận lệnh; trạng thái bơm thực tế chưa được đo độc lập.'
    case 'Completed':
      return 'ESP32 báo lệnh đã hoàn tất; hệ thống không có cảm biến xác nhận độc lập trạng thái bơm.'
    case 'Failed':
      return command.errorMessage || 'ESP32 báo lệnh thất bại.'
    default:
      return `Lệnh vẫn đang chờ ESP32 phản hồi. Mã lệnh: ${command.id}.`
  }
}

export default function PumpControl({ deviceId, deviceName, isOnline }: PumpControlProps) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [lastCommandId, setLastCommandId] = useState<string | null>(null)

  const send = async (action: PumpCommandAction) => {
    if (!isOnline || pending) return
    setPending(true)
    setMessage('Đang gửi lệnh và chờ ESP32 xác nhận…')
    try {
      const result = await sendPumpCommand(deviceId, action)
      setLastCommandId(result.command.id)
      setMessage(resultMessage(result.command, result.timedOut))
    } catch {
      setMessage('Không gửi hoặc tra cứu được lệnh. Hãy kiểm tra kết nối rồi thử lại.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-[#dce7e0] bg-[#f8fbf9] p-4" aria-label={`Điều khiển bơm ${deviceName}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1f2937]">Điều khiển bơm</h4>
          <p className="mt-1 text-xs text-muted">Lệnh được gửi đến {deviceName}; kết quả là phản hồi do ESP32 báo.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!isOnline || pending}
            onClick={() => void send('START_PUMP')}
            className="rounded-lg bg-[#216348] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#174c36] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bật bơm
          </button>
          <button
            type="button"
            disabled={!isOnline || pending}
            onClick={() => void send('STOP_PUMP')}
            className="rounded-lg border border-[#cbd5d0] bg-white px-3 py-2 text-xs font-semibold text-[#1f2937] transition hover:bg-[#f3f6f4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tắt bơm
          </button>
        </div>
      </div>
      {!isOnline && <p className="mt-2 text-xs font-medium text-[#a65300]">Thiết bị ngoại tuyến; thao tác điều khiển bị khóa.</p>}
      {message && <p className="mt-3 text-xs leading-5 text-muted" role="status" aria-live="polite">{message}</p>}
      {lastCommandId && <p className="mt-1 break-all text-[11px] text-muted">Mã lệnh: {lastCommandId}</p>}
    </section>
  )
}
