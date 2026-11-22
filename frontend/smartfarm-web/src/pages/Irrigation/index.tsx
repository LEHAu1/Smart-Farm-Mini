import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceDto } from '../../types/device';
import type {
  IrrigationRuleDto,
  IrrigationStatusDto,
  CreateIrrigationRuleRequest,
} from '../../types/irrigation';
import type { PageResult } from '../../types/common';
import { StatusDot } from '../../components/common/StatusDot';
import { Badge } from '../../components/common/Badge';
import {
  Droplets,
  AlertTriangle,
  Play,
  Square,
  ShieldAlert,
  Plus,
  Sliders,
  CheckCircle2,
  Clock,
  Power,
  X,
} from 'lucide-react';

export default function IrrigationPage() {
  const { t, language } = useLanguage();
  const { onDeviceStatus } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [status, setStatus] = useState<IrrigationStatusDto | null>(null);
  const [rules, setRules] = useState<IrrigationRuleDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual pump runtime slider in seconds
  const [manualDuration, setManualDuration] = useState<number>(30);

  // Emergency stop confirmation modal state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);

  // Add rule modal state
  const [isAddRuleOpen, setIsAddRuleOpen] = useState<boolean>(false);
  const [newRule, setNewRule] = useState<CreateIrrigationRuleRequest>({
    deviceId: '',
    name: '',
    moistureThreshold: 50,
    targetMoisture: 75,
    minIntervalMinutes: 60,
    maxDurationSeconds: 45,
  });

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const isDeviceOnline = Boolean(selectedDevice?.isOnline);

  // 1. Fetch devices on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDevices() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/devices?pageSize=50');
        if (isMounted && data?.items) {
          setDevices(data.items);
          if (data.items.length > 0) {
            setSelectedDeviceId(data.items[0].id);
          }
        }
      } catch {
        // Handled via empty state
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch irrigation status and rules when device changes
  const loadDeviceIrrigation = useCallback(async (devId: string) => {
    if (!devId) return;
    try {
      const [statusRes, rulesRes] = await Promise.all([
        apiClient.get<IrrigationStatusDto>(`/api/devices/${devId}/irrigation/status`),
        apiClient.get<IrrigationRuleDto[]>(`/api/devices/${devId}/irrigation-rules`),
      ]);
      setStatus(statusRes.data);
      setRules(rulesRes.data || []);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      loadDeviceIrrigation(selectedDeviceId);
    }
  }, [selectedDeviceId, loadDeviceIrrigation]);

  // 3. Device connectivity is updated in real time. Command delivery is not
  // treated as proof that a physical actuator changed state.
  useEffect(() => {
    const unsubDevice = onDeviceStatus((devStatus) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === devStatus.deviceId ? { ...d, isOnline: devStatus.isOnline } : d))
      );
    });

    return () => {
      unsubDevice();
    };
  }, [onDeviceStatus]);

  // Handle Manual Pump Action
  const handlePumpControl = async (turnOn: boolean) => {
    if (!selectedDeviceId || !isDeviceOnline) return;
    setIsActionLoading(true);
    setFeedbackMessage(null);

    const action = turnOn ? 'START_PUMP' : 'STOP_PUMP';
    const payload = turnOn ? JSON.stringify({ durationSeconds: manualDuration }) : undefined;

    try {
      await apiClient.post(`/api/devices/${selectedDeviceId}/commands`, {
        action,
        payload,
      });
      setFeedbackMessage({
        type: 'success',
        text: turnOn
          ? language === 'vi'
            ? `Backend đã nhận lệnh bật bơm (${manualDuration}s); chưa xác nhận trạng thái bơm vật lý.`
            : `Backend accepted the pump-on command (${manualDuration}s); physical pump state is not confirmed.`
          : language === 'vi'
          ? 'Backend đã nhận lệnh tắt bơm; chưa xác nhận trạng thái bơm vật lý.'
          : 'Backend accepted the pump-off command; physical pump state is not confirmed.',
      });
      // Refresh status after dispatch
      setTimeout(() => loadDeviceIrrigation(selectedDeviceId), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lệnh điều khiển bơm.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Emergency Stop Action
  const handleEmergencyStop = async () => {
    if (!selectedDeviceId) return;
    setIsActionLoading(true);
    setIsEmergencyModalOpen(false);
    setFeedbackMessage(null);

    try {
      await apiClient.post(`/api/devices/${selectedDeviceId}/commands`, {
        action: 'EMERGENCY_STOP',
      });
      setFeedbackMessage({
        type: 'success',
        text:
          language === 'vi'
            ? 'Backend đã nhận lệnh EMERGENCY_STOP; trạng thái relay và bơm vật lý chưa được xác nhận.'
            : 'Backend accepted EMERGENCY_STOP; physical relay and pump state are not confirmed.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi lệnh ngắt khẩn cấp.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Toggle Rule Enable/Disable
  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      await apiClient.patch(`/api/irrigation-rules/${ruleId}/toggle`, {
        isEnabled: !currentEnabled,
      });
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isEnabled: !currentEnabled } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi bật/tắt quy tắc tưới.';
      setFeedbackMessage({ type: 'error', text: msg });
    }
  };

  // Create New Rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) return;
    setIsActionLoading(true);

    try {
      const { data } = await apiClient.post<IrrigationRuleDto>(
        `/api/devices/${selectedDeviceId}/irrigation-rules`,
        { ...newRule, deviceId: selectedDeviceId }
      );
      setRules((prev) => [...prev, data]);
      setIsAddRuleOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: language === 'vi' ? 'Đã tạo quy tắc tưới thành công!' : 'Rule created successfully!',
      });
      setNewRule({
        deviceId: '',
        name: '',
        moistureThreshold: 50,
        targetMoisture: 75,
        minIntervalMinutes: 60,
        maxDurationSeconds: 45,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo quy tắc tưới.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Droplets className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">
          {language === 'vi' ? 'Chưa có thiết bị nào được đăng ký' : 'No Devices Registered'}
        </h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          {language === 'vi'
            ? 'Vui lòng thêm thiết bị phần cứng tại trang Thiết bị để bắt đầu thiết lập tưới tiêu.'
            : 'Please add a device in the Devices page to start configuring irrigation.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Device Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{t('nav_irrigation', 'TƯỚI NƯỚC THÔNG MINH')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Điều khiển & Quy tắc tưới' : 'Irrigation Controls & Rules'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {language === 'vi'
              ? 'Vận hành máy bơm thủ công, quy định ngưỡng ẩm tự động và ngắt khẩn cấp an toàn.'
              : 'Operate pumps manually, configure soil moisture thresholds, and emergency stop.'}
          </p>
        </div>

        {/* Device Picker Dropdown */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <label htmlFor="device-select" className="text-xs font-semibold text-muted">
            {language === 'vi' ? 'Thiết bị:' : 'Device:'}
          </label>
          <select
            id="device-select"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-2xs focus:border-primary focus:outline-none"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.isOnline ? 'Online' : 'Offline'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            feedbackMessage.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Device Status & Offline Warning Banner */}
      {!isDeviceOnline && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold">
              {language === 'vi' ? 'Thiết bị đang Ngoại tuyến (Offline)' : 'Device is Currently Offline'}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              {language === 'vi'
                ? 'Các thao tác kích hoạt máy bơm đã bị khóa an toàn. Bạn chỉ có thể kích hoạt bơm khi thiết bị kết nối lại thành công.'
                : 'Pump activation controls are safely locked. You can only dispatch watering commands once the node reconnects.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Control Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Manual Control Panel */}
        <section className="panel space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Power className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">
                  {language === 'vi' ? 'Bơm nước thủ công' : 'Manual Pump Operation'}
                </h2>
                <p className="text-xs text-muted">
                  {language === 'vi' ? 'Kích hoạt tưới ngay lập tức' : 'Trigger irrigation immediately'}
                </p>
              </div>
            </div>

            <StatusDot
              status={status?.isPumpRunning ? 'online' : 'offline'}
              label={status?.isPumpRunning ? (language === 'vi' ? 'Đang chạy' : 'Running') : (language === 'vi' ? 'Đang tắt' : 'Idle')}
              size="md"
            />
          </div>

          {/* Runtime Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted">{language === 'vi' ? 'Thời gian bơm tối đa:' : 'Max Runtime Duration:'}</span>
              <span className="text-primary font-mono text-sm">{manualDuration} {language === 'vi' ? 'giây' : 'seconds'}</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={manualDuration}
              disabled={!isDeviceOnline || status?.isPumpRunning}
              onChange={(e) => setManualDuration(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-muted font-mono">
              <span>5s</span>
              <span>30s</span>
              <span>60s</span>
              <span>120s</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {status?.isPumpRunning ? (
              <button
                type="button"
                disabled={!isDeviceOnline || isActionLoading}
                onClick={() => handlePumpControl(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                <Square className="size-4 fill-white" />
                <span>{language === 'vi' ? 'Dừng bơm ngay' : 'Stop Pump'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!isDeviceOnline || isActionLoading}
                onClick={() => handlePumpControl(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                <Play className="size-4 fill-white" />
                <span>{language === 'vi' ? 'Bật máy bơm' : 'Start Pump'}</span>
              </button>
            )}

            {/* Emergency Stop Button */}
            <button
              type="button"
              onClick={() => setIsEmergencyModalOpen(true)}
              disabled={isActionLoading}
              title={language === 'vi' ? 'Ngắt khẩn cấp máy bơm' : 'Emergency Stop'}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold px-4 py-3 text-xs sm:text-sm transition-colors"
            >
              <ShieldAlert className="size-4 text-rose-600 dark:text-rose-400" />
              <span>{language === 'vi' ? 'DỪNG KHẨN CẤP' : 'EMERGENCY STOP'}</span>
            </button>
          </div>

          {/* Last Watering Summary */}
          {status?.lastIrrigationStartedAtUtc && (
            <div className="rounded-xl border border-line bg-canvas p-3 flex items-center justify-between text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {language === 'vi' ? 'Lần tưới gần nhất:' : 'Last watered:'}
              </span>
              <span className="font-semibold text-ink">
                {new Date(status.lastIrrigationStartedAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({status.lastIrrigationDurationSeconds ?? 0}s)
              </span>
            </div>
          )}
        </section>

        {/* Automatic Rules Summary & List */}
        <section className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Sliders className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">
                  {language === 'vi' ? 'Quy tắc tự động' : 'Automatic Rules'}
                </h2>
                <p className="text-xs text-muted">
                  {language === 'vi' ? 'Tưới khi độ ẩm đất dưới ngưỡng' : 'Trigger when soil moisture drops'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRuleOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-2 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>{language === 'vi' ? 'Thêm quy tắc' : 'Add Rule'}</span>
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              {language === 'vi'
                ? 'Chưa có quy tắc tự động nào được thiết lập cho thiết bị này.'
                : 'No automatic rules configured for this device.'}
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-line bg-canvas p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">{rule.name}</span>
                      <Badge variant={rule.isEnabled ? 'success' : 'default'}>
                        {rule.isEnabled ? (language === 'vi' ? 'Đang bật' : 'Active') : (language === 'vi' ? 'Tắt' : 'Disabled')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {language === 'vi'
                        ? `Bơm khi độ ẩm < ${rule.moistureThreshold}% (đạt ${rule.targetMoisture}%), tối đa ${rule.maxDurationSeconds}s`
                        : `Water below ${rule.moistureThreshold}% (target ${rule.targetMoisture}%), max ${rule.maxDurationSeconds}s`}
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id, rule.isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.isEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        rule.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Emergency Stop Modal */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-4">
              <ShieldAlert className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">
              {language === 'vi' ? 'Xác nhận Dừng khẩn cấp?' : 'Confirm Emergency Stop?'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {language === 'vi'
                ? 'Lệnh sẽ được gửi qua Backend/MQTT. Firmware telemetry ESP32 hiện tại chưa có phần nhận lệnh và điều khiển relay, vì vậy giao diện không thể xác nhận máy bơm đã dừng.'
                : 'The command will be sent through Backend/MQTT. The current ESP32 telemetry firmware has no command receiver or relay control, so this page cannot confirm that the pump stopped.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(false)}
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
              >
                {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleEmergencyStop}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-semibold shadow-sm"
              >
                {language === 'vi' ? 'Xác nhận ngắt' : 'Confirm Stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="text-base font-bold text-ink">
                {language === 'vi' ? 'Tạo quy tắc tưới tự động' : 'Create Automatic Rule'}
              </h3>
              <button onClick={() => setIsAddRuleOpen(false)} className="text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {language === 'vi' ? 'Tên quy tắc' : 'Rule Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'vi' ? 'Ví dụ: Tưới hoa hồng sáng' : 'E.g., Morning Rose Watering'}
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {language === 'vi' ? 'Ngưỡng ẩm kích hoạt (%)' : 'Threshold (%)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={newRule.moistureThreshold}
                    onChange={(e) => setNewRule({ ...newRule, moistureThreshold: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {language === 'vi' ? 'Độ ẩm mục tiêu (%)' : 'Target (%)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newRule.targetMoisture}
                    onChange={(e) => setNewRule({ ...newRule, targetMoisture: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {language === 'vi' ? 'Khoảng cách giữa 2 lần (phút)' : 'Min Interval (min)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1440"
                    required
                    value={newRule.minIntervalMinutes}
                    onChange={(e) => setNewRule({ ...newRule, minIntervalMinutes: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {language === 'vi' ? 'Thời gian bơm tối đa (giây)' : 'Max Duration (sec)'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={newRule.maxDurationSeconds}
                    onChange={(e) => setNewRule({ ...newRule, maxDurationSeconds: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-hover"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-semibold shadow-sm"
                >
                  {language === 'vi' ? 'Tạo quy tắc' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
