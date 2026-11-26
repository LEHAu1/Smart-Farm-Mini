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
  Pencil,
  Trash2,
  PowerOff,
  Power,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
interface ActionFeedback {
  type: 'success' | 'error';
  text: string;
}

function getAddDeviceErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const apiError = error as {
      message?: unknown;
      response?: { data?: unknown };
    };
    const responseData = apiError.response?.data;

    if (responseData && typeof responseData === 'object') {
      const body = responseData as Record<string, unknown>;
      for (const field of ['error', 'message', 'title', 'detail']) {
        const value = body[field];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }

    if (typeof apiError.message === 'string' && apiError.message.trim()) {
      return apiError.message;
    }
  }

  return fallback;
}

// ─── Component ───────────────────────────────────────────
export default function DevicesPage() {
  const { language } = useLanguage();
  const { onDeviceStatus } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  // ── Detail drawer ──
  const [selectedDevice, setSelectedDevice] = useState<DeviceDto | null>(null);

  // ── Add Device Modal ──
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Edit Device Modal ──
  const [editDevice, setEditDevice] = useState<DeviceDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete Confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<DeviceDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Active/Deactivate in-flight ──
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // 1. Load devices from REST API
  // ─────────────────────────────────────────────────────────
  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/devices', {
        params: { pageNumber: 1, pageSize: 100 },
      });
      if (data?.items) setDevices(data.items);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 2. Real-time SignalR connection status
  useEffect(() => {
    const unsub = onDeviceStatus((status) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === status.deviceId
            ? { ...d, isOnline: status.isOnline, lastSeenAtUtc: status.lastSeenAtUtc }
            : d
        )
      );
      setSelectedDevice((prev) =>
        prev?.id === status.deviceId
          ? { ...prev, isOnline: status.isOnline, lastSeenAtUtc: status.lastSeenAtUtc }
          : prev
      );
    });
    return unsub;
  }, [onDeviceStatus]);

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // ─────────────────────────────────────────────────────────
  // Add Device
  // ─────────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddCode('');
    setAddName('');
    setAddDesc('');
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim()) {
      setAddError(language === 'vi' ? 'Vui lòng nhập mã thiết bị.' : 'Device Code is required.');
      return;
    }
    if (!addName.trim()) {
      setAddError(language === 'vi' ? 'Vui lòng nhập tên thiết bị.' : 'Device Name is required.');
      return;
    }
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(addCode.trim())) {
      setAddError(
        language === 'vi'
          ? 'Mã thiết bị chỉ được chứa chữ cái không dấu, chữ số, dấu gạch ngang và gạch dưới (tối đa 50 ký tự).'
          : 'Device Code may contain only letters, numbers, hyphens, and underscores (up to 50 characters).'
      );
      return;
    }

    setIsAddSubmitting(true);
    setAddError(null);
    try {
      const { data } = await apiClient.post<DeviceDto>('/api/devices', {
        deviceCode: addCode.trim(),
        name: addName.trim(),
        description: addDesc.trim() || undefined,
      });
      setDevices((prev) => [data, ...prev]);
      setIsAddOpen(false);
      showFeedback('success', language === 'vi' ? 'Đăng ký thiết bị thành công!' : 'Device registered successfully!');
    } catch (err: unknown) {
      setAddError(
        getAddDeviceErrorMessage(
          err,
          language === 'vi' ? 'Lỗi khi đăng ký thiết bị.' : 'Failed to register device.'
        )
      );
    } finally {
      setIsAddSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Edit Device
  // ─────────────────────────────────────────────────────────
  const openEditModal = (device: DeviceDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditDevice(device);
    setEditName(device.name);
    setEditDesc(device.description ?? '');
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDevice || !editName.trim()) return;

    setIsEditSubmitting(true);
    setEditError(null);
    try {
      const { data } = await apiClient.put<DeviceDto>(`/api/devices/${editDevice.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setDevices((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      // If the drawer is open for the same device, refresh it too
      setSelectedDevice((prev) => (prev?.id === data.id ? data : prev));
      setEditDevice(null);
      showFeedback('success', language === 'vi' ? 'Cập nhật thiết bị thành công!' : 'Device updated successfully!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'vi'
          ? 'Lỗi khi cập nhật thiết bị.'
          : 'Failed to update device.';
      setEditError(msg);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete Device (Soft Delete)
  // ─────────────────────────────────────────────────────────
  const openDeleteConfirm = (device: DeviceDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteTarget(device);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/devices/${deleteTarget.id}`);
      setDevices((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (selectedDevice?.id === deleteTarget.id) setSelectedDevice(null);
      setDeleteTarget(null);
      showFeedback(
        'success',
        language === 'vi' ? 'Thiết bị đã được xóa thành công!' : 'Device deleted successfully!'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'vi'
          ? 'Lỗi khi xóa thiết bị.'
          : 'Failed to delete device.';
      showFeedback('error', msg);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Activate / Deactivate
  // ─────────────────────────────────────────────────────────
  const handleToggleActive = async (device: DeviceDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTogglingId(device.id);
    try {
      const endpoint = device.isActive
        ? `/api/devices/${device.id}/deactivate`
        : `/api/devices/${device.id}/activate`;
      await apiClient.put(endpoint);
      const updated = { ...device, isActive: !device.isActive, isOnline: device.isActive ? false : device.isOnline };
      setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)));
      setSelectedDevice((prev) => (prev?.id === device.id ? updated : prev));
      showFeedback(
        'success',
        updated.isActive
          ? language === 'vi' ? 'Thiết bị đã được kích hoạt.' : 'Device activated.'
          : language === 'vi' ? 'Thiết bị đã bị vô hiệu hóa.' : 'Device deactivated.'
      );
    } catch {
      showFeedback('error', language === 'vi' ? 'Thao tác thất bại.' : 'Action failed.');
    } finally {
      setTogglingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────
  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{language === 'vi' ? 'QUẢN LÝ THIẾT BỊ' : 'DEVICE MANAGEMENT'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Danh sách nút IoT trong vườn' : 'Garden IoT Nodes'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {language === 'vi'
              ? 'Theo dõi, chỉnh sửa và quản lý toàn bộ thiết bị ESP32.'
              : 'Monitor, edit, and manage all your ESP32 IoT nodes.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold px-4 py-2.5 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>{language === 'vi' ? 'Thêm thiết bị mới' : 'Add New Device'}</span>
        </button>
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

      {/* Stat Counters */}
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
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{onlineCount}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">{language === 'vi' ? 'Ngoại tuyến' : 'Offline'}</span>
            <StatusDot status="offline" size="sm" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-500">{offlineCount}</p>
        </div>
      </div>

      {/* Device List */}
      {isLoading ? (
        <div className="panel py-12 text-center text-muted">
          <div className="flex items-center justify-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{language === 'vi' ? 'Đang tải danh sách thiết bị...' : 'Loading devices...'}</span>
          </div>
        </div>
      ) : hasLoadError ? (
        <div role="alert" className="panel py-12 text-center">
          <AlertCircle className="mx-auto size-10 text-rose-500 mb-2" />
          <p className="font-semibold text-ink">
            {language === 'vi' ? 'Không thể tải danh sách thiết bị.' : 'Could not load devices.'}
          </p>
          <button
            type="button"
            onClick={loadDevices}
            className="mt-3 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-hover"
          >
            {language === 'vi' ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      ) : devices.length === 0 ? (
        <div className="panel py-12 text-center text-muted">
          <Cpu className="mx-auto size-10 text-muted/50 mb-2" />
          <p className="font-semibold text-ink">
            {language === 'vi' ? 'Chưa có thiết bị nào được đăng ký' : 'No devices registered'}
          </p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {language === 'vi'
              ? 'Bấm nút "Thêm thiết bị mới" và nhập Device Code để kết nối ESP32.'
              : 'Click "Add New Device" and enter your Device Code to connect your ESP32.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className={`cursor-pointer rounded-2xl border p-5 hover:border-primary/50 hover:shadow-sm transition-all space-y-3 relative group ${
                device.isActive
                  ? 'border-line bg-surface'
                  : 'border-dashed border-slate-300 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-700'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <h3 className="font-bold text-ink text-base group-hover:text-primary transition-colors truncate">
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

              {/* Inactive badge */}
              {!device.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  <PowerOff className="size-3" />
                  {language === 'vi' ? 'Đã vô hiệu hóa' : 'Deactivated'}
                </span>
              )}

              {/* Info row */}
              <div className="pt-2 border-t border-line/60 grid grid-cols-2 gap-2 text-[11px] text-muted">
                <div className="flex items-center gap-1.5">
                  <Wifi className="size-3.5 text-muted/70" />
                  <span>Wi-Fi: <strong className="text-ink font-normal">{device.isOnline ? 'OK' : '--'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-muted/70" />
                  <span>FW: <strong className="text-ink font-normal">ESP32</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {device.lastSeenAtUtc
                    ? new Date(device.lastSeenAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--'}
                </span>

                {/* Action buttons (stop propagation so card click isn't triggered) */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Edit */}
                  <button
                    type="button"
                    title={language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                    onClick={(e) => openEditModal(device, e)}
                    className="rounded-lg p-1 text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Toggle active/inactive */}
                  <button
                    type="button"
                    disabled={togglingId === device.id}
                    title={device.isActive
                      ? (language === 'vi' ? 'Vô hiệu hóa' : 'Deactivate')
                      : (language === 'vi' ? 'Kích hoạt lại' : 'Activate')}
                    onClick={(e) => handleToggleActive(device, e)}
                    className={`rounded-lg p-1 transition-colors ${
                      device.isActive
                        ? 'text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    {togglingId === device.id ? (
                      <span className="size-3.5 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : device.isActive ? (
                      <PowerOff className="size-3.5" />
                    ) : (
                      <Power className="size-3.5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    title={language === 'vi' ? 'Xóa thiết bị' : 'Delete device'}
                    onClick={(e) => openDeleteConfirm(device, e)}
                    className="rounded-lg p-1 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ DEVICE DETAIL DRAWER ══════════════════════════════════ */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setSelectedDevice(null)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl border border-line space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-primary uppercase">{selectedDevice.deviceCode}</span>
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
                  label={selectedDevice.isOnline ? 'Online (MQTT)' : 'Offline'}
                  size="sm"
                />
              </div>
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Trạng thái hoạt động:' : 'Active Status:'}</span>
                <span className={`font-semibold ${selectedDevice.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {selectedDevice.isActive
                    ? (language === 'vi' ? 'Đang hoạt động' : 'Active')
                    : (language === 'vi' ? 'Đã vô hiệu hóa' : 'Deactivated')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Lần cuối thấy:' : 'Last Seen:'}</span>
                <span className="font-semibold text-ink">
                  {selectedDevice.lastSeenAtUtc
                    ? new Date(selectedDevice.lastSeenAtUtc).toLocaleString()
                    : (language === 'vi' ? 'Chưa từng online' : 'Never seen')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Vi điều khiển:' : 'Microcontroller:'}</span>
                <span className="font-mono text-ink">ESP32-WROOM-32</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Mô-đun Camera:' : 'Camera Module:'}</span>
                <span className="text-muted italic text-[11px]">
                  {language === 'vi' ? 'OV2640 (Chờ tích hợp phần cứng)' : 'OV2640 (Hardware pending)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Ngày khởi tạo:' : 'Created:'}</span>
                <span className="font-mono text-ink">{new Date(selectedDevice.createdAtUtc).toLocaleDateString()}</span>
              </div>
              {selectedDevice.description && (
                <div className="pt-2">
                  <span className="text-muted block mb-1">{language === 'vi' ? 'Mô tả:' : 'Description:'}</span>
                  <p className="rounded-xl border border-line bg-canvas p-3 text-ink leading-relaxed">
                    {selectedDevice.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { openEditModal(selectedDevice); setSelectedDevice(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-hover"
                >
                  <Pencil className="size-3.5" />
                  {language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                </button>
                <button
                  type="button"
                  disabled={togglingId === selectedDevice.id}
                  onClick={() => handleToggleActive(selectedDevice)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedDevice.isActive
                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {selectedDevice.isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                  {selectedDevice.isActive
                    ? (language === 'vi' ? 'Vô hiệu hóa' : 'Deactivate')
                    : (language === 'vi' ? 'Kích hoạt' : 'Activate')}
                </button>
                <button
                  type="button"
                  onClick={() => { openDeleteConfirm(selectedDevice); setSelectedDevice(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 text-rose-600 px-3 py-2 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  {language === 'vi' ? 'Xóa' : 'Delete'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDevice(null)}
                className="rounded-xl bg-primary text-white text-xs font-semibold px-5 py-2 hover:bg-primary-hover shadow-xs"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD DEVICE MODAL ═════════════════════════════════════ */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setIsAddOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                {language === 'vi' ? 'Đăng ký thiết bị phần cứng mới' : 'Register New Hardware Node'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            {addError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                {addError}
              </div>
            )}

            <form onSubmit={handleAdd} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Mã định danh thiết bị (Device Code)' : 'Device Code'} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  pattern={'[\\-A-Za-z0-9_]{1,50}'}
                  title={language === 'vi' ? 'Chỉ dùng chữ cái không dấu, chữ số, dấu gạch ngang và gạch dưới (tối đa 50 ký tự).' : 'Use letters, numbers, hyphens, or underscores (up to 50 characters).'}
                  placeholder={language === 'vi' ? 'Ví dụ: SF-NODE-01' : 'e.g. SF-NODE-01'}
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-mono font-medium text-ink focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted mt-1">
                  {language === 'vi'
                    ? 'Mã in trên vỏ mạch ESP32 hoặc cấu hình trong firmware.'
                    : 'Code printed on ESP32 or configured in firmware. Cannot be changed later.'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Tên thiết bị' : 'Device Name'} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder={language === 'vi' ? 'Ví dụ: Chậu hoa hồng ban công' : 'e.g. Balcony Rose Pot'}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Mô tả / Vị trí đặt' : 'Description / Location'}
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder={language === 'vi' ? 'Ví dụ: Góc vườn hướng Đông' : 'e.g. East-facing garden corner'}
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isAddSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-semibold shadow-xs disabled:opacity-60"
                >
                  {isAddSubmitting
                    ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                    : (language === 'vi' ? 'Đăng ký' : 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT DEVICE MODAL ════════════════════════════════════ */}
      {editDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setEditDevice(null)}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {language === 'vi' ? 'Chỉnh sửa thiết bị' : 'Edit Device'}
                </h3>
                <p className="text-[11px] font-mono text-muted mt-0.5">{editDevice.deviceCode}</p>
              </div>
              <button onClick={() => setEditDevice(null)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                {editError}
              </div>
            )}

            {/* Device Code is read-only — it's the hardware identifier */}
            <div className="rounded-xl border border-line/60 bg-canvas/60 px-3.5 py-2.5">
              <p className="text-[10px] text-muted uppercase font-semibold tracking-wide">
                {language === 'vi' ? 'Mã thiết bị (không thể thay đổi)' : 'Device Code (cannot be changed)'}
              </p>
              <p className="font-mono text-sm font-semibold text-ink mt-0.5">{editDevice.deviceCode}</p>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Tên thiết bị' : 'Device Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Mô tả / Vị trí đặt' : 'Description / Location'}
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDevice(null)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-semibold shadow-xs disabled:opacity-60"
                >
                  {isEditSubmitting
                    ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                    : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRMATION DIALOG ═══════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {language === 'vi' ? 'Xóa thiết bị?' : 'Delete Device?'}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {language === 'vi'
                    ? `Thiết bị "${deleteTarget.name}" (${deleteTarget.deviceCode}) sẽ bị xóa. Dữ liệu cảm biến, lịch sử tưới và cảnh báo vẫn được giữ lại.`
                    : `Device "${deleteTarget.name}" (${deleteTarget.deviceCode}) will be deleted. All sensor history, irrigation logs, and alerts are preserved.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-60"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs disabled:opacity-60 transition-colors"
              >
                {isDeleting ? (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {isDeleting
                  ? (language === 'vi' ? 'Đang xóa...' : 'Deleting...')
                  : (language === 'vi' ? 'Xóa thiết bị' : 'Delete Device')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
