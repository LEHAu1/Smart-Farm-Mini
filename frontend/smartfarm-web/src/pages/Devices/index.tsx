import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import { StatusDot } from '../../components/common/StatusDot';
import {
  Cpu,
  Plus,
  Clock,
  Wifi,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function DevicesPage() {
  const { t, language } = useLanguage();
  const { onDeviceStatus } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDto | null>(null);

  // Add Device Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDeviceCode, setNewDeviceCode] = useState<string>('');
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [newDeviceDesc, setNewDeviceDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Initial REST API load
  const loadDevices = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/devices', {
        params: { pageNumber: 1, pageSize: 50 },
      });
      if (data?.items) {
        setDevices(data.items);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 2. Real-time DeviceConnectionStatusChanged event
  useEffect(() => {
    const unsub = onDeviceStatus((status) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === status.deviceId ? { ...d, isOnline: status.isOnline, lastSeenAtUtc: status.lastSeenAtUtc } : d))
      );
      if (selectedDevice?.id === status.deviceId) {
        setSelectedDevice((prev) => (prev ? { ...prev, isOnline: status.isOnline, lastSeenAtUtc: status.lastSeenAtUtc } : null));
      }
    });

    return () => {
      unsub();
    };
  }, [onDeviceStatus, selectedDevice]);

  // Handle Add Device
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode.trim() || !newDeviceName.trim()) return;

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const { data } = await apiClient.post<DeviceDto>('/api/devices', {
        deviceCode: newDeviceCode.trim(),
        name: newDeviceName.trim(),
        description: newDeviceDesc.trim() || undefined,
      });

      setDevices((prev) => [data, ...prev]);
      setIsAddModalOpen(false);
      setNewDeviceCode('');
      setNewDeviceName('');
      setNewDeviceDesc('');
      setActionFeedback({
        type: 'success',
        text: language === 'vi' ? 'Đăng ký thiết bị thành công!' : 'Device registered successfully!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đăng ký thiết bị mới.';
      setActionFeedback({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{t('nav_devices', 'QUẢN LÝ THIẾT BỊ')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Danh sách nút IoT trong vườn' : 'Garden IoT Nodes'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {language === 'vi'
              ? 'Theo dõi trạng thái kết nối trực tiếp của các vi điều khiển ESP32 và cảm biến.'
              : 'Live connection health of physical ESP32 nodes and soil sensing units.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold px-4 py-2.5 transition-colors shadow-xs"
          >
            <Plus className="size-4" />
            <span>{language === 'vi' ? 'Thêm thiết bị mới' : 'Add New Device'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            actionFeedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <AlertCircle className="size-5 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs opacity-75 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{language === 'vi' ? 'Tổng số nút' : 'Total Nodes'}</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{devices.length}</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{language === 'vi' ? 'Đang trực tuyến' : 'Online'}</span>
            <StatusDot status="online" size="sm" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {onlineCount}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{language === 'vi' ? 'Ngoại tuyến' : 'Offline'}</span>
            <StatusDot status="offline" size="sm" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-500">{offlineCount}</p>
        </div>
      </div>

      {/* Devices List Grid */}
      {isLoading ? (
        <div className="panel py-12 text-center text-muted">
          <div className="flex items-center justify-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{language === 'vi' ? 'Đang tải danh sách thiết bị...' : 'Loading devices...'}</span>
          </div>
        </div>
      ) : devices.length === 0 ? (
        <div className="panel py-12 text-center text-muted">
          <Cpu className="mx-auto size-10 text-muted/50 mb-2" />
          <p className="font-semibold text-ink">
            {language === 'vi' ? 'Chưa có thiết bị nào được gán vào tài khoản' : 'No devices registered'}
          </p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {language === 'vi'
              ? 'Bấm nút "Thêm thiết bị mới" phía trên và nhập Device Code để bắt đầu kết nối ESP32.'
              : 'Click "Add New Device" above with your device code to pair your ESP32 node.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className="cursor-pointer rounded-2xl border border-line bg-surface p-5 hover:border-primary/50 hover:shadow-sm transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink text-base group-hover:text-primary transition-colors">
                    {device.name}
                  </h3>
                  <p className="font-mono text-xs text-muted mt-0.5">{device.deviceCode}</p>
                </div>
                <StatusDot
                  status={device.isOnline ? 'online' : 'offline'}
                  label={device.isOnline ? 'Online' : 'Offline'}
                  size="sm"
                />
              </div>

              {device.description && (
                <p className="text-xs text-muted leading-relaxed line-clamp-2">{device.description}</p>
              )}

              {/* Hardware & Signal indicators (Marked as waiting for firmware) */}
              <div className="pt-2 border-t border-line/60 grid grid-cols-2 gap-2 text-[11px] text-muted">
                <div className="flex items-center gap-1.5">
                  <Wifi className="size-3.5 text-muted/70" />
                  <span>Wi-Fi: <strong className="text-ink font-normal">{device.isOnline ? 'Tín hiệu OK' : '--'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-muted/70" />
                  <span>FW: <strong className="text-ink font-normal">v1.0 (ESP32)</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {device.lastSeenAtUtc
                    ? new Date(device.lastSeenAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--'}
                </span>
                <span className="text-primary font-semibold group-hover:underline">
                  {language === 'vi' ? 'Chi tiết' : 'Details'} →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Device Detail Drawer / Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl border border-line space-y-5">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-primary uppercase">
                  {selectedDevice.deviceCode}
                </span>
                <h2 className="text-lg font-bold text-ink mt-0.5">{selectedDevice.name}</h2>
              </div>
              <button onClick={() => setSelectedDevice(null)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Trạng thái mạng:' : 'Network State:'}</span>
                <StatusDot
                  status={selectedDevice.isOnline ? 'online' : 'offline'}
                  label={selectedDevice.isOnline ? 'Online (MQTT Connected)' : 'Offline (Disconnected)'}
                  size="sm"
                />
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Lần cuối thấy (Last Seen):' : 'Last Seen:'}</span>
                <span className="font-semibold text-ink">
                  {selectedDevice.lastSeenAtUtc
                    ? new Date(selectedDevice.lastSeenAtUtc).toLocaleString()
                    : (language === 'vi' ? 'Chưa từng online' : 'Never seen')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Vi điều khiển (MCU):' : 'Microcontroller:'}</span>
                <span className="font-mono text-ink">ESP32-WROOM-32</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Mô-đun Camera:' : 'Camera Module:'}</span>
                <span className="text-muted italic">
                  {language === 'vi' ? 'OV2640 (Đang chờ tích hợp phần cứng)' : 'OV2640 (Hardware integration pending)'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Ngày khởi tạo:' : 'Created Date:'}</span>
                <span className="text-ink font-mono">
                  {new Date(selectedDevice.createdAtUtc).toLocaleDateString()}
                </span>
              </div>

              {selectedDevice.description && (
                <div className="pt-2">
                  <span className="text-muted block mb-1">{language === 'vi' ? 'Mô tả vị trí cây trồng:' : 'Description:'}</span>
                  <p className="rounded-xl border border-line bg-canvas p-3 text-ink leading-relaxed">
                    {selectedDevice.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDevice(null)}
                className="rounded-xl bg-primary text-white text-xs font-semibold px-5 py-2.5 hover:bg-primary-hover shadow-xs"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                {language === 'vi' ? 'Đăng ký thiết bị phần cứng mới' : 'Register New Hardware Node'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Mã định danh thiết bị (Device Code)' : 'Device Code'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SF-NODE-01"
                  value={newDeviceCode}
                  onChange={(e) => setNewDeviceCode(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-mono font-medium text-ink focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted mt-1">
                  {language === 'vi'
                    ? 'Mã in trên vỏ mạch ESP32 hoặc cấu hình trong firmware.'
                    : 'Code printed on ESP32 or configured in firmware.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Tên gợi nhớ (Device Name)' : 'Device Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chậu hoa hồng ban công"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Mô tả / Vị trí đặt' : 'Description / Location'}
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đặt ở góc vườn hướng Đông"
                  value={newDeviceDesc}
                  onChange={(e) => setNewDeviceDesc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-semibold shadow-xs"
                >
                  {isSubmitting
                    ? language === 'vi' ? 'Đang lưu...' : 'Saving...'
                    : language === 'vi' ? 'Đăng ký' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
