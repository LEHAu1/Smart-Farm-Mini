import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import { StatusDot } from '../../components/common/StatusDot';
import { Badge } from '../../components/common/Badge';
import {
  Cpu,
  Radio,
  Clock,
  Wifi,
  WifiOff,
  Calendar,
} from 'lucide-react';

export default function DevicesPage() {
  const { t, language } = useLanguage();
  const { isConnected, onDeviceStatus } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [updatedDeviceId, setUpdatedDeviceId] = useState<string | null>(null);

  // 1. Initial REST API load
  useEffect(() => {
    let isMounted = true;
    async function fetchDevices() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/Devices', {
          params: { pageNumber: 1, pageSize: 50 },
        });
        if (isMounted && data?.items) {
          setDevices(data.items);
        }
      } catch {
        // Fallback for offline demo
      }
    }
    fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time DeviceConnectionStatusChanged event
  useEffect(() => {
    const unsub = onDeviceStatus((status) => {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id === status.deviceId) {
            return {
              ...d,
              isOnline: status.isOnline,
              lastSeenAtUtc: status.lastSeenAtUtc ?? new Date().toISOString(),
            };
          }
          return d;
        })
      );

      setUpdatedDeviceId(status.deviceId);
      setTimeout(() => setUpdatedDeviceId(null), 2000);
    });

    return () => {
      unsub();
    };
  }, [onDeviceStatus]);

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{t('nav_devices', 'Thiết bị')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Quản lý thiết bị ESP32' : 'IoT Nodes & Devices'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {t('placeholder_devices_desc', 'Quản lý thiết bị ESP32 và theo dõi trạng thái kết nối.')}
          </p>
        </div>

        {/* Real-time status */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isConnected ? (
            <Badge variant="success" showDot className="animate-in fade-in">
              {t('signalr_connected', 'Thời gian thực: Đã kết nối')}
            </Badge>
          ) : (
            <Badge variant="default" showDot>
              {t('signalr_disconnected', 'Thời gian thực: Mất kết nối')}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-muted">
              {language === 'vi' ? 'Tổng số thiết bị' : 'Total Devices'}
            </span>
            <p className="mt-1 text-2xl font-bold text-ink">{devices.length}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-subtle text-primary">
            <Cpu className="size-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-muted">
              {language === 'vi' ? 'Đang trực tuyến' : 'Online Nodes'}
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{onlineCount}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wifi className="size-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-muted">
              {language === 'vi' ? 'Mất kết nối' : 'Offline Nodes'}
            </span>
            <p className="mt-1 text-2xl font-bold text-slate-500">{offlineCount}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
            <WifiOff className="size-5" />
          </span>
        </div>
      </div>

      {/* Devices List Table/Cards */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <span>{language === 'vi' ? 'Danh sách nút cảm biến IoT' : 'Connected Sensor Nodes'}</span>
          </h2>
          <span className="text-xs text-muted">
            Event: <code className="font-mono text-primary text-[11px]">DeviceConnectionStatusChanged</code>
          </span>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            {language === 'vi' ? 'Chưa có thiết bị nào được gán cho tài khoản của bạn.' : 'No devices found.'}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {devices.map((device) => {
              const isJustUpdated = updatedDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-300 ${
                    isJustUpdated
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'hover:bg-canvas/50'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas border border-line text-primary mt-0.5 sm:mt-0">
                      <Cpu className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{device.name}</span>
                        <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-mono text-muted border border-line">
                          {device.deviceCode}
                        </span>
                      </div>
                      {device.description && (
                        <p className="text-xs text-muted mt-0.5">{device.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(device.createdAtUtc).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                        </span>
                        {device.lastSeenAtUtc && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {language === 'vi' ? 'Lần cuối:' : 'Last seen:'}{' '}
                            {new Date(device.lastSeenAtUtc).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusDot
                      status={device.isOnline ? 'online' : 'offline'}
                      label={device.isOnline ? 'Online' : 'Offline'}
                      size="md"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
