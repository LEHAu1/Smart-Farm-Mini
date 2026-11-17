import { mockDashboardData } from './mock-data'
import { getStoredAccessToken } from '../../services/auth-storage'
import { useSensorHub } from '../../hooks/useSensorHub'
import PumpControl from '../../components/devices/PumpControl'

const sensorAccent: Record<(typeof mockDashboardData.sensors)[number]['accent'], string> = {
  green: 'bg-[#e7f1e9] text-[#216348]',
  blue: 'bg-[#e8f4fb] text-[#106493]',
  amber: 'bg-[#fff5e6] text-[#a65300]',
}

export default function DashboardPage() {
  const { status: hubStatus, telemetry, devices: liveDevices, isTelemetryStale } = useSensorHub(Boolean(getStoredAccessToken()))
  const hasLiveTelemetry = Boolean(telemetry && Object.values(telemetry).some((value) => typeof value === 'number'))
  const isRealtimeTelemetry = telemetry?.source === 'signalr'
  const liveSensors: Record<string, number | null | undefined> = {
    'soil-moisture': telemetry?.soilMoisture,
    'air-temperature': telemetry?.airTemperature,
    'air-humidity': telemetry?.airHumidity,
    'water-temperature': telemetry?.waterTemperature,
    'water-level': telemetry?.waterLevel,
  }
  const visibleDevices = liveDevices.length > 0
    ? liveDevices.map((device) => ({
        id: device.deviceId,
        name: device.name || device.deviceCode,
        kind: device.deviceCode,
        status: device.isOnline ? 'Online' : 'Ngoại tuyến',
        detail: device.lastSeenAtUtc
          ? `Lần cuối ghi nhận: ${new Date(device.lastSeenAtUtc).toLocaleString('vi-VN')}`
          : 'Chưa có thời gian ghi nhận gần nhất',
        initials: (device.name || device.deviceCode || 'D').slice(0, 1).toUpperCase(),
        isLive: true,
        isController: /esp32|controller|điều khiển/i.test(`${device.name} ${device.deviceCode}`),
      }))
    : mockDashboardData.devices.map((device) => ({ ...device, isLive: false, isController: false }))

  return (
    <main className="mx-auto max-w-6xl" aria-labelledby="dashboard-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">SMART FARM MINI · TỔNG QUAN</p>
          <h1 id="dashboard-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Tổng quan khu vườn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Theo dõi môi trường và tình trạng thiết bị trong khu vườn của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-[#e0e7e3] bg-white px-3 py-2 text-xs font-medium text-muted sm:self-auto">
          <span aria-hidden="true" className={`size-2 rounded-full ${hubStatus === 'connected' ? 'bg-[#216348]' : hubStatus === 'reconnecting' || hubStatus === 'connecting' ? 'bg-[#d97706]' : 'bg-[#dc2626]'}`} />
          {hubStatus === 'connected' ? 'SignalR đã kết nối' : hubStatus === 'reconnecting' ? 'Đang kết nối lại' : 'Bản xem trước'}
        </div>
      </header>

      <aside
        className={`mt-6 flex gap-3 rounded-[14px] border p-4 sm:p-5 ${hasLiveTelemetry ? 'border-[#b6dfc8] bg-[#eff9f2] text-[#164b34]' : 'border-[#f4d49e] bg-[#fff8eb] text-[#6e3900]'}`}
        role="note"
        aria-label={hasLiveTelemetry ? 'Trạng thái dữ liệu cảm biến' : 'Thông tin dữ liệu mô phỏng'}
      >
        <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold">i</span>
        <div>
          <p className="text-sm font-semibold">{isRealtimeTelemetry ? 'Dữ liệu cảm biến trực tiếp' : hasLiveTelemetry ? 'Dữ liệu cảm biến đã lưu' : 'Dữ liệu mô phỏng'}</p>
          <p className="mt-1 text-xs leading-5 sm:text-sm">
            {hasLiveTelemetry
              ? isRealtimeTelemetry
                ? isTelemetryStale ? 'Đã nhận dữ liệu SignalR nhưng bản tin cuối đã cũ hoặc thiếu thời gian cập nhật.' : 'Số liệu cảm biến mới nhận qua SignalR.'
                : 'Số liệu tổng hợp được tải từ backend/database; API hiện chưa cung cấp thời điểm của mẫu mới nhất.'
              : 'Các số liệu và trạng thái thiết bị bên dưới là dữ liệu mẫu để xem giao diện, chưa được đọc từ cảm biến hay thiết bị thật.'}
          </p>
          <p className="mt-1 text-xs" role="status" aria-live="polite">
            SignalR: {hubStatus === 'connected' ? 'Đã kết nối' : hubStatus === 'reconnecting' || hubStatus === 'connecting' ? 'Đang kết nối lại' : hubStatus === 'error' ? 'Lỗi kết nối' : 'Ngoại tuyến'}
            {telemetry?.lastUpdatedAtUtc && ` · Nhận lúc ${new Date(telemetry.lastUpdatedAtUtc).toLocaleTimeString('vi-VN')}`}
          </p>
        </div>
      </aside>

      <section className="mt-8" aria-labelledby="sensor-section-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="sensor-section-title" className="text-lg font-semibold sm:text-xl">Môi trường khu vườn</h2>
            <p className="mt-1 text-sm text-muted">{isRealtimeTelemetry ? 'Bản tin cảm biến mới nhất' : hasLiveTelemetry ? 'Số liệu tổng hợp đã lưu' : 'Các chỉ số cảm biến mẫu'}</p>
          </div>
          <p className="text-xs text-muted">
            {isRealtimeTelemetry && telemetry?.lastUpdatedAtUtc
              ? `Cập nhật: ${new Date(telemetry.lastUpdatedAtUtc).toLocaleString('vi-VN')}`
              : hasLiveTelemetry ? 'Thời điểm mẫu: API chưa cung cấp' : `Cập nhật mô phỏng: ${mockDashboardData.updatedAt}`}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {mockDashboardData.sensors.map((sensor) => {
            const liveValue = liveSensors[sensor.id]
            const isLiveValue = typeof liveValue === 'number'
            return (
              <article
                key={sensor.id}
                className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(31,41,55,0.05)]"
                aria-labelledby={`${sensor.id}-title`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id={`${sensor.id}-title`} className="text-sm font-semibold text-[#1f2937]">{sensor.name}</h3>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">Cảm biến · {isLiveValue ? isRealtimeTelemetry ? 'SignalR' : 'CSDL' : 'Mô phỏng'}</p>
                  </div>
                  <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xl font-medium ${sensorAccent[sensor.accent]}`}>
                    {sensor.icon}
                  </span>
                </div>

                <p className="mt-6 flex min-h-10 items-baseline gap-1.5 text-3xl font-bold tracking-tight text-[#121c2a] tabular-nums">
                  <span>{isLiveValue ? liveValue : sensor.value}</span>
                  {(sensor.unit || (sensor.id === 'water-level' && isLiveValue)) && (
                    <span className="text-base font-semibold text-muted">
                      {sensor.id === 'water-level' && isLiveValue ? '%' : sensor.unit}
                    </span>
                  )}
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#edf0ee] pt-3">
                  <span className="text-xs text-muted">{sensor.detail}</span>
                  <span className="shrink-0 rounded-full bg-[#e7f1e9] px-2.5 py-1 text-[11px] font-semibold text-[#216348]">
                    {isLiveValue ? isRealtimeTelemetry ? isTelemetryStale ? 'Dữ liệu cũ' : 'Realtime' : 'Đã lưu' : sensor.status}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="device-section-title">
        <div>
          <h2 id="device-section-title" className="text-lg font-semibold sm:text-xl">Thiết bị trong vườn</h2>
          <p className="mt-1 text-sm text-muted">{liveDevices.length > 0 ? 'Trạng thái cập nhật qua SignalR' : 'Trạng thái kết nối mẫu · chưa phản ánh thiết bị thật'}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {visibleDevices.map((device) => {
            const isOnline = device.status === 'Online'
            return (
              <article key={device.id} className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(31,41,55,0.05)] sm:p-6">
                <div className="flex items-center gap-4">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e7f1e9] text-lg font-bold text-[#216348]">
                    {device.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[#1f2937]">{device.name}</h3>
                    <p className="mt-1 text-xs text-muted">{device.kind}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${isOnline ? 'bg-[#e7f1e9] text-[#216348]' : 'bg-[#fff0ef] text-[#b42318]'}`}>
                    <span aria-hidden="true" className={`size-2 rounded-full ${isOnline ? 'bg-[#216348]' : 'bg-[#dc2626]'}`} />
                    {device.status} · {device.isLive ? 'SignalR' : 'mô phỏng'}
                  </span>
                </div>
                <p className="mt-4 border-t border-[#edf0ee] pt-3 text-sm text-muted">{device.detail}</p>
                {device.isLive && device.isController && (
                  <PumpControl deviceId={device.id} deviceName={device.name} isOnline={isOnline} />
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
