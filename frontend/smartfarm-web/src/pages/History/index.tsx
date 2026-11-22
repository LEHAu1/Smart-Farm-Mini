import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../services/api-client';
import type { IrrigationLogDto } from '../../types/irrigation';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import { Badge } from '../../components/common/Badge';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Droplets,
  RotateCcw,
} from 'lucide-react';

export default function HistoryPage() {
  const { t, language } = useLanguage();

  const [logs, setLogs] = useState<IrrigationLogDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const pageSize = 15;

  // Filters
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [fromUtc, setFromUtc] = useState<string>('');
  const [toUtc, setToUtc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch paginated irrigation logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('pageNumber', pageIndex.toString());
      params.append('pageSize', pageSize.toString());

      if (selectedDeviceId) params.append('deviceId', selectedDeviceId);
      if (selectedMode) params.append('mode', selectedMode);
      if (fromUtc) params.append('fromUtc', new Date(fromUtc).toISOString());
      if (toUtc) params.append('toUtc', new Date(toUtc).toISOString());

      const { data } = await apiClient.get<PageResult<IrrigationLogDto>>(`/api/irrigation-logs?${params.toString()}`);
      if (data) {
        setLogs(data.items || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, selectedDeviceId, selectedMode, fromUtc, toUtc]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleResetFilters = () => {
    setSelectedDeviceId('');
    setSelectedMode('');
    setFromUtc('');
    setToUtc('');
    setPageIndex(1);
  };

  const getStatusBadge = (status: number, statusName: string) => {
    // IrrigationStatus: 1=InProgress, 2=Completed, 3=Stopped, 4=Failed
    switch (status) {
      case 2:
        return (
          <Badge variant="success" showDot>
            {statusName || (language === 'vi' ? 'Hoàn thành' : 'Completed')}
          </Badge>
        );
      case 1:
        return (
          <Badge variant="water" showDot className="animate-pulse">
            {statusName || (language === 'vi' ? 'Đang tưới' : 'In Progress')}
          </Badge>
        );
      case 3:
        return (
          <Badge variant="warning">
            {statusName || (language === 'vi' ? 'Tạm ngắt' : 'Stopped')}
          </Badge>
        );
      default:
        return (
          <Badge variant="danger">
            {statusName || (language === 'vi' ? 'Lỗi' : 'Failed')}
          </Badge>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow">{t('nav_history', 'LỊCH SỬ VẬN HÀNH')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
          {language === 'vi' ? 'Nhật ký tưới nước' : 'Irrigation History'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {language === 'vi'
            ? 'Theo dõi toàn bộ phiên tưới tiêu, lượng nước tiêu thụ và độ ẩm đất phục hồi.'
            : 'Track historical watering sessions, water consumption, and soil moisture response.'}
        </p>
      </div>

      {/* Filter Bar */}
      <section className="panel p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Filter className="size-3.5" />
            {language === 'vi' ? 'Bộ lọc tìm kiếm' : 'Filter Logs'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
            >
              <option value="">{language === 'vi' ? 'Tất cả thiết bị' : 'All Devices'}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Chế độ tưới' : 'Mode'}
            </label>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
            >
              <option value="">{language === 'vi' ? 'Tất cả chế độ' : 'All Modes'}</option>
              <option value="1">{language === 'vi' ? 'Thủ công (Manual)' : 'Manual'}</option>
              <option value="2">{language === 'vi' ? 'Tự động (Automatic)' : 'Automatic'}</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Từ ngày' : 'From Date'}
            </label>
            <input
              type="date"
              value={fromUtc}
              onChange={(e) => {
                setFromUtc(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              {language === 'vi' ? 'Đến ngày' : 'To Date'}
            </label>
            <input
              type="date"
              value={toUtc}
              onChange={(e) => {
                setToUtc(e.target.value);
                setPageIndex(1);
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Logs Table Panel */}
      <section className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{language === 'vi' ? 'Thời gian bắt đầu' : 'Start Time'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Thiết bị' : 'Device'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Chế độ' : 'Mode'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Thời lượng' : 'Duration'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Độ ẩm (Trước → Sau)' : 'Moisture (Pre → Post)'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Lượng nước' : 'Water'}</th>
                <th className="py-3 px-4">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>{language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading history...'}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <Droplets className="mx-auto size-8 text-muted/60 mb-2" />
                    <p className="font-semibold">{language === 'vi' ? 'Chưa có bản ghi tưới nào' : 'No irrigation records found'}</p>
                    <p className="text-[11px] mt-0.5">
                      {language === 'vi'
                        ? 'Các phiên tưới thủ công hoặc tự động sẽ được lưu lại tại đây.'
                        : 'Manual or automated watering sessions will be logged here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const deviceName = devices.find((d) => d.id === log.deviceId)?.name || log.deviceId.substring(0, 8);
                  return (
                    <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {new Date(log.startedAtUtc).toLocaleString([], {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">{deviceName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-ink">
                          {log.mode === 1 ? (language === 'vi' ? 'Thủ công' : 'Manual') : (language === 'vi' ? 'Tự động' : 'Automatic')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.durationSeconds !== null && log.durationSeconds !== undefined ? `${log.durationSeconds}s` : '--'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.soilMoistureBefore !== null && log.soilMoistureBefore !== undefined ? `${log.soilMoistureBefore}%` : '--'}
                        {' → '}
                        {log.soilMoistureAfter !== null && log.soilMoistureAfter !== undefined ? `${log.soilMoistureAfter}%` : '--'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.waterAmountMl !== null && log.waterAmountMl !== undefined ? `${log.waterAmountMl} ml` : '--'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(log.status, log.statusName)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs">
          <span className="text-muted">
            {language === 'vi' ? 'Tổng số:' : 'Total:'}{' '}
            <strong className="text-ink font-semibold">{totalCount}</strong>{' '}
            {language === 'vi' ? 'phiên' : 'records'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageIndex <= 1 || isLoading}
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center size-8 rounded-lg border border-line bg-surface text-ink hover:bg-surface-hover disabled:opacity-40"
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
              className="flex items-center justify-center size-8 rounded-lg border border-line bg-surface text-ink hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
