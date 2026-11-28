import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceCommandDto } from '../../types/command';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import { Badge } from '../../components/common/Badge';
import {
  Terminal,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react';

export default function CommandsPage() {
  const { t, language } = useLanguage();
  const { onCommandStatus } = useSensorHub();

  const [commands, setCommands] = useState<DeviceCommandDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCmd, setSelectedCmd] = useState<DeviceCommandDto | null>(null);

  // Dispatch manual command form state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('START_PUMP');
  const [commandPayload, setCommandPayload] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Load initial data
  const loadData = useCallback(async () => {
    try {
      const [cmdRes, devRes] = await Promise.all([
        apiClient.get<PageResult<DeviceCommandDto>>('/api/commands?pageSize=50'),
        apiClient.get<PageResult<DeviceDto>>('/api/devices?pageSize=50'),
      ]);
      if (cmdRes?.data?.items) setCommands(cmdRes.data.items);
      if (devRes?.data?.items) {
        setDevices(devRes.data.items);
        if (devRes.data.items.length > 0) setTargetDeviceId(devRes.data.items[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Real-time CommandStatusUpdated event listener
  useEffect(() => {
    const unsub = onCommandStatus((liveCmd) => {
      setCommands((prev) => {
        const index = prev.findIndex((c) => c.id === liveCmd.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...liveCmd };
          return next;
        }
        return [liveCmd, ...prev];
      });

      if (selectedCmd?.id === liveCmd.id) {
        setSelectedCmd((prev) => (prev ? { ...prev, ...liveCmd } : null));
      }
    });

    return () => {
      unsub();
    };
  }, [onCommandStatus, selectedCmd]);

  // Handle Dispatch Command
  const handleDispatchCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeviceId) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { data } = await apiClient.post<DeviceCommandDto>(
        `/api/devices/${targetDeviceId}/commands`,
        {
          action: selectedAction,
          payload: commandPayload.trim() || undefined,
        }
      );

      setCommands((prev) => [data, ...prev]);
      setIsDispatchModalOpen(false);
      setFeedback({
        type: 'success',
        text: language === 'vi' ? 'Đã phát tán lệnh thành công qua MQTT Broker!' : 'Command published to MQTT Broker!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi lệnh.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (statusName: string) => {
    switch (statusName) {
      case 'Completed':
        return <Badge variant="success">{language === 'vi' ? 'Hoàn thành' : 'Completed'}</Badge>;
      case 'Acknowledged':
        return <Badge variant="water" showDot className="animate-pulse">{language === 'vi' ? 'Đã nhận (ACK)' : 'Acknowledged'}</Badge>;
      case 'Pending':
        return <Badge variant="warning" showDot>{language === 'vi' ? 'Đang gửi...' : 'Pending'}</Badge>;
      default:
        return <Badge variant="danger">{language === 'vi' ? 'Thất bại' : 'Failed'}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{t('nav_commands', 'NHẬT KÝ LỆNH ĐIỀU KHIỂN')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Giám sát lệnh chấp hành' : 'Device Command Queue'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {language === 'vi'
              ? 'Theo dõi vòng đời lệnh MQTT từ khi tạo, thiết bị phản hồi ACK đến lúc hoàn tất.'
              : 'End-to-end command lifecycle tracking (Created → Published → ACKed → Completed).'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsDispatchModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold px-4 py-2.5 transition-colors shadow-xs"
          >
            <Plus className="size-4" />
            <span>{language === 'vi' ? 'Gửi lệnh trực tiếp' : 'Dispatch Command'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-75 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Commands Table Panel */}
      <section className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="glass-table text-left text-xs">
            <thead className="text-[11px] font-bold text-muted uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{language === 'vi' ? 'Mã lệnh' : 'Command Code'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Thiết bị' : 'Device'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Hành động' : 'Action'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Thời gian tạo' : 'Created At'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{language === 'vi' ? 'Chi tiết' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>{language === 'vi' ? 'Đang tải danh sách lệnh...' : 'Loading commands...'}</span>
                    </div>
                  </td>
                </tr>
              ) : commands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <Terminal className="mx-auto size-8 text-muted/60 mb-2" />
                    <p className="font-semibold">{language === 'vi' ? 'Chưa có lệnh nào được tạo' : 'No commands queued'}</p>
                    <p className="text-[11px] mt-0.5">
                      {language === 'vi'
                        ? 'Các lệnh bơm nước hoặc điều khiển sẽ được hiển thị và cập nhật tức thời.'
                        : 'Dispatched pump or system commands will appear here in real-time.'}
                    </p>
                  </td>
                </tr>
              ) : (
                commands.map((cmd) => {
                  const deviceName = devices.find((d) => d.id === cmd.deviceId)?.name || cmd.deviceId.substring(0, 8);
                  return (
                    <tr
                      key={cmd.id}
                      onClick={() => setSelectedCmd(cmd)}
                      className="cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{cmd.commandCode}</td>
                      <td className="py-3 px-4 font-medium">{deviceName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold">
                          {cmd.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted">
                        {new Date(cmd.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(cmd.statusName)}</td>
                      <td className="py-3 px-4 text-right text-primary font-semibold hover:underline">
                        {language === 'vi' ? 'Xem' : 'Inspect'} →
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Command Lifecycle Drawer / Modal */}
      {selectedCmd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-modal-backdrop p-4">
          <div className="w-full max-w-lg rounded-2xl glass-modal p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-primary uppercase">{selectedCmd.commandCode}</span>
                <h2 className="text-lg font-bold text-ink mt-0.5">{selectedCmd.action}</h2>
              </div>
              <button onClick={() => setSelectedCmd(null)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            {/* Visual Timeline of Command Lifecycle */}
            <div className="rounded-xl glass-panel-subtle p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                {language === 'vi' ? 'Tiến trình vòng đời lệnh' : 'Command Lifecycle Progression'}
              </span>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  <span>{language === 'vi' ? '1. Đã tạo lệnh' : '1. Created'}</span>
                </div>
                <div className={`flex items-center gap-1.5 font-semibold ${selectedCmd.acknowledgedAtUtc ? 'text-emerald-600' : 'text-muted'}`}>
                  <CheckCircle2 className="size-4" />
                  <span>{language === 'vi' ? '2. Thiết bị ACK' : '2. Node ACK'}</span>
                </div>
                <div className={`flex items-center gap-1.5 font-semibold ${selectedCmd.completedAtUtc ? 'text-emerald-600' : selectedCmd.statusName === 'Failed' ? 'text-rose-600' : 'text-muted'}`}>
                  <CheckCircle2 className="size-4" />
                  <span>{selectedCmd.statusName === 'Failed' ? (language === 'vi' ? '3. Thất bại' : '3. Failed') : (language === 'vi' ? '3. Hoàn tất' : '3. Completed')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Thời gian tạo:' : 'Created Time:'}</span>
                <span className="font-mono text-ink">{new Date(selectedCmd.createdAtUtc).toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Phản hồi ACK từ ESP32:' : 'Node Acknowledged:'}</span>
                <span className="font-mono text-ink">
                  {selectedCmd.acknowledgedAtUtc ? new Date(selectedCmd.acknowledgedAtUtc).toLocaleString() : (language === 'vi' ? 'Chưa nhận ACK' : 'Awaiting ACK')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/50">
                <span className="text-muted">{language === 'vi' ? 'Thời gian hoàn tất:' : 'Completed Time:'}</span>
                <span className="font-mono text-ink">
                  {selectedCmd.completedAtUtc ? new Date(selectedCmd.completedAtUtc).toLocaleString() : '--'}
                </span>
              </div>

              {selectedCmd.payload && (
                <div className="pt-2">
                  <span className="text-muted block mb-1">Payload JSON:</span>
                  <pre className="rounded-xl glass-panel-subtle p-3 font-mono text-[11px] text-ink overflow-x-auto">
                    {selectedCmd.payload}
                  </pre>
                </div>
              )}

              {selectedCmd.errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs">
                  <strong>{language === 'vi' ? 'Thông báo lỗi:' : 'Error Message:'}</strong> {selectedCmd.errorMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCmd(null)}
                className="rounded-xl bg-primary text-white text-xs font-semibold px-5 py-2.5 hover:bg-primary-hover shadow-xs"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Command Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-modal-backdrop p-4">
          <div className="w-full max-w-md rounded-2xl glass-modal p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                {language === 'vi' ? 'Phát lệnh điều khiển thiết bị' : 'Dispatch Node Command'}
              </h3>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchCommand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Thiết bị tiếp nhận' : 'Target Device'} *
                </label>
                <select
                  required
                  value={targetDeviceId}
                  onChange={(e) => setTargetDeviceId(e.target.value)}
                  className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm font-medium text-ink"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.isOnline ? 'Online' : 'Offline'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Lệnh thực thi (Action)' : 'Action'} *
                </label>
                <select
                  required
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm font-medium text-ink"
                >
                  <option value="START_PUMP">START_PUMP (Kích hoạt máy bơm)</option>
                  <option value="STOP_PUMP">STOP_PUMP (Dừng máy bơm)</option>
                  <option value="EMERGENCY_STOP">EMERGENCY_STOP (Ngắt khẩn cấp)</option>
                  <option value="RESET_SYSTEM">RESET_SYSTEM (Khởi động lại MCU)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Payload JSON (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder='{"durationSeconds": 30}'
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm font-mono text-ink"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="glass-button-secondary rounded-xl px-4 py-2.5 text-xs font-semibold text-ink"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-semibold shadow-xs"
                >
                  {isSubmitting
                    ? language === 'vi' ? 'Đang gửi...' : 'Publishing...'
                    : language === 'vi' ? 'Gửi lệnh' : 'Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
