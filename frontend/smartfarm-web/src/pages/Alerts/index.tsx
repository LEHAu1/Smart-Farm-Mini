import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../services/api-client';
import type { AlertDto } from '../../types/alert';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import { Badge } from '../../components/common/Badge';
import {
  CheckCircle2,
  Check,
  Filter,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export default function AlertsPage() {
  const { t, language } = useLanguage();

  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const pageSize = 15;

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedResolved, setSelectedResolved] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load devices for filter dropdown
  useEffect(() => {
    async function loadDevices() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/devices?pageSize=50');
        if (data?.items) {
          setDevices(data.items);
        }
      } catch {
        // Fallback
      }
    }
    loadDevices();
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('pageNumber', pageIndex.toString());
      params.append('pageSize', pageSize.toString());

      if (selectedSeverity) params.append('severity', selectedSeverity);
      if (selectedResolved !== '') params.append('isResolved', selectedResolved);
      if (selectedDeviceId) params.append('deviceId', selectedDeviceId);

      const { data } = await apiClient.get<PageResult<AlertDto>>(`/api/alerts?${params.toString()}`);
      if (data) {
        setAlerts(data.items || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch {
      setAlerts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, selectedSeverity, selectedResolved, selectedDeviceId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Handle Resolve Alert
  const handleResolveAlert = async (alertId: string) => {
    setActionMessage(null);
    try {
      await apiClient.patch(`/api/alerts/${alertId}/resolve`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isResolved: true, resolvedAtUtc: new Date().toISOString() } : a))
      );
      setActionMessage({
        type: 'success',
        text: language === 'vi' ? 'Đã xử lý và đóng cảnh báo thành công!' : 'Alert marked as resolved!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xử lý cảnh báo.';
      setActionMessage({ type: 'error', text: msg });
    }
  };

  const getSeverityBadge = (severity: number, severityName: string) => {
    // 1=Info, 2=Warning, 3=Critical
    switch (severity) {
      case 3:
        return (
          <Badge variant="danger" showDot className="animate-pulse">
            {severityName || 'Critical'}
          </Badge>
        );
      case 2:
        return (
          <Badge variant="warning" showDot>
            {severityName || 'Warning'}
          </Badge>
        );
      default:
        return (
          <Badge variant="default">
            {severityName || 'Info'}
          </Badge>
        );
    }
  };

  const handleResetFilters = () => {
    setSelectedSeverity('');
    setSelectedResolved('');
    setSelectedDeviceId('');
    setPageIndex(1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow">{t('nav_alerts', 'HỆ THỐNG GIÁM SÁT AN TOÀN')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
          {language === 'vi' ? 'Cảnh báo nông trại' : 'Farm System Alerts'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {language === 'vi'
            ? 'Theo dõi sự cố cạn nước bình chứa, đất quá khô hoặc nhiệt độ vượt ngưỡng an toàn.'
            : 'Monitor reservoir water shortage, drought alerts, and critical thermal conditions.'}
        </p>
      </div>

      {/* Action Message Banner */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs opacity-75 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <section className="panel p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Filter className="size-3.5" />
            {language === 'vi' ? 'Bộ lọc cảnh báo' : 'Filter Alerts'}
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <RotateCcw className="size-3" />
            <span>{language === 'vi' ? 'Đặt lại' : 'Reset'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Device filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Thiết bị' : 'Device'}
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl glass-input px-3 py-2 text-xs font-medium text-ink"
            >
              <option value="">{language === 'vi' ? 'Tất cả thiết bị' : 'All Devices'}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Mức độ cảnh báo' : 'Severity'}
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl glass-input px-3 py-2 text-xs font-medium text-ink"
            >
              <option value="">{language === 'vi' ? 'Tất cả mức độ' : 'All Severities'}</option>
              <option value="3">{language === 'vi' ? 'Nghiêm trọng (Critical)' : 'Critical'}</option>
              <option value="2">{language === 'vi' ? 'Cảnh báo (Warning)' : 'Warning'}</option>
              <option value="1">{language === 'vi' ? 'Thông tin (Info)' : 'Info'}</option>
            </select>
          </div>

          {/* Resolved filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Trạng thái giải quyết' : 'Status'}
            </label>
            <select
              value={selectedResolved}
              onChange={(e) => {
                setSelectedResolved(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl glass-input px-3 py-2 text-xs font-medium text-ink"
            >
              <option value="">{language === 'vi' ? 'Tất cả trạng thái' : 'All Status'}</option>
              <option value="false">{language === 'vi' ? 'Chưa giải quyết' : 'Unresolved'}</option>
              <option value="true">{language === 'vi' ? 'Đã giải quyết' : 'Resolved'}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Alerts List */}
      <section className="space-y-3">
        {isLoading ? (
          <div className="panel py-12 text-center text-muted">
            <div className="flex items-center justify-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{language === 'vi' ? 'Đang tải cảnh báo...' : 'Loading alerts...'}</span>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="panel py-12 text-center text-muted">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500 mb-2" />
            <p className="font-semibold text-ink">
              {language === 'vi' ? 'Hệ thống an toàn, không có cảnh báo nào!' : 'All Clear! No alerts found'}
            </p>
            <p className="text-xs text-muted mt-1">
              {language === 'vi'
                ? 'Các thông báo ngưỡng bất thường sẽ được hiển thị ngay khi phát sinh.'
                : 'Abnormal sensor threshold violations will appear here immediately.'}
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const deviceName = devices.find((d) => d.id === alert.deviceId)?.name || alert.deviceId.substring(0, 8);
            return (
              <div
                key={alert.id}
                className={`panel p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                  alert.isResolved ? 'opacity-70 glass-panel-subtle' : 'border-l-4 border-l-rose-500 card-3d'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(alert.severity, alert.severityName)}
                    <span className="font-mono text-[11px] text-muted">[{alert.alertCode}]</span>
                    <span className="text-xs font-semibold text-primary">{deviceName}</span>
                  </div>

                  <h3 className="text-sm font-bold text-ink">{alert.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{alert.message}</p>

                  <div className="flex items-center gap-3 text-[11px] text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(alert.createdAtUtc).toLocaleString([], {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {alert.isResolved && alert.resolvedAtUtc && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {language === 'vi' ? 'Đã giải quyết lúc' : 'Resolved at'}{' '}
                        {new Date(alert.resolvedAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div className="self-end sm:self-center">
                  {!alert.isResolved ? (
                    <button
                      type="button"
                      onClick={() => handleResolveAlert(alert.id)}
                      className="glass-button-secondary inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-2 text-ink transition-colors"
                    >
                      <Check className="size-4 text-emerald-600" />
                      <span>{language === 'vi' ? 'Đánh dấu đã xử lý' : 'Mark Resolved'}</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-muted flex items-center gap-1">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span>{language === 'vi' ? 'Đã xử lý' : 'Resolved'}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between panel px-4 py-3 text-xs">
            <span className="text-muted">
              {language === 'vi' ? 'Tổng số:' : 'Total:'}{' '}
              <strong className="text-ink font-semibold">{totalCount}</strong>{' '}
              {language === 'vi' ? 'cảnh báo' : 'alerts'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageIndex <= 1 || isLoading}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                className="glass-button-secondary flex items-center justify-center size-8 rounded-lg text-ink disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-semibold text-ink px-1">
                {pageIndex} / {totalPages}
              </span>
              <button
                type="button"
                disabled={pageIndex >= totalPages || isLoading}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                className="glass-button-secondary flex items-center justify-center size-8 rounded-lg text-ink disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
