import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DashboardSummaryDto } from '../../types/dashboard';
import { StatusDot } from '../../components/common/StatusDot';
import { Badge } from '../../components/common/Badge';
import {
  Sprout,
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Cpu,
  Activity,
  Radio,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { isConnected, connectionStatus, onTelemetry, onDeviceStatus, onCommandStatus } =
    useSensorHub();

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<Date | null>(null);
  const [isTelemetryFlashing, setIsTelemetryFlashing] = useState<boolean>(false);

  // 1. Initial REST API loading
  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        const { data } = await apiClient.get<DashboardSummaryDto>('/api/Dashboard/summary');
        if (isMounted && data) {
          setSummary(data);
        }
      } catch {
        // Fallback or empty state if API offline
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time SignalR Event Listeners
  useEffect(() => {
    // Listen for live sensor telemetry
    const unsubTelemetry = onTelemetry((telemetry) => {
      setLastTelemetryTime(new Date());
      setIsTelemetryFlashing(true);
      setTimeout(() => setIsTelemetryFlashing(false), 1200);

      setSummary((prev) => {
        if (!prev) {
          return {
            devices: { totalDevices: 1, onlineDevices: 1, offlineDevices: 0, activeIrrigatingDevices: 0 },
            sensors: {
              averageSoilMoisture: telemetry.soilMoisture,
              averageAirTemperature: telemetry.airTemperature,
              averageAirHumidity: telemetry.airHumidity,
              averageWaterTemperature: telemetry.waterTemperature,
              averageWaterLevel: telemetry.waterLevel,
            },
            isAnyPumpRunning: false,
            recentAlerts: [],
            recentIrrigationLogs: [],
          };
        }

        return {
          ...prev,
          sensors: {
            ...prev.sensors,
            ...(telemetry.soilMoisture !== undefined && { averageSoilMoisture: telemetry.soilMoisture }),
            ...(telemetry.airTemperature !== undefined && { averageAirTemperature: telemetry.airTemperature }),
            ...(telemetry.airHumidity !== undefined && { averageAirHumidity: telemetry.airHumidity }),
            ...(telemetry.waterTemperature !== undefined && { averageWaterTemperature: telemetry.waterTemperature }),
            ...(telemetry.waterLevel !== undefined && { averageWaterLevel: telemetry.waterLevel }),
          },
        };
      });
    });

    // Listen for device connection status changes (online/offline)
    const unsubDeviceStatus = onDeviceStatus((status) => {
      setSummary((prev) => {
        if (!prev) return null;
        const currentOnline = prev.devices.onlineDevices;
        const currentOffline = prev.devices.offlineDevices;
        const total = prev.devices.totalDevices;

        if (status.isOnline) {
          return {
            ...prev,
            devices: {
              ...prev.devices,
              onlineDevices: Math.min(total, currentOnline + 1),
              offlineDevices: Math.max(0, currentOffline - 1),
            },
          };
        } else {
          return {
            ...prev,
            devices: {
              ...prev.devices,
              onlineDevices: Math.max(0, currentOnline - 1),
              offlineDevices: Math.min(total, currentOffline + 1),
            },
          };
        }
      });
    });

    // Listen for device command status updates (actuators / pumps)
    const unsubCommand = onCommandStatus((command) => {
      if (command.action.toLowerCase().includes('pump') || command.action.toLowerCase().includes('water')) {
        const isRunning = command.statusName === 'Acknowledged' || command.statusName === 'Pending';
        setSummary((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isAnyPumpRunning: isRunning,
          };
        });
      }
    });

    return () => {
      unsubTelemetry();
      unsubDeviceStatus();
      unsubCommand();
    };
  }, [onTelemetry, onDeviceStatus, onCommandStatus]);

  const formatTelemetryValue = (value: number | null | undefined, unit: string) => {
    if (value === null || value === undefined) return '--';
    return `${Number(value).toFixed(1)} ${unit}`;
  };

  const signalRStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="success" showDot className="animate-in fade-in">
            {t('signalr_connected', 'Thời gian thực: Đã kết nối')}
          </Badge>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <Badge variant="warning" showDot className="animate-pulse">
            {t('signalr_connecting', 'Thời gian thực: Đang kết nối...')}
          </Badge>
        );
      default:
        return (
          <Badge variant="default" showDot>
            {t('signalr_disconnected', 'Thời gian thực: Mất kết nối')}
          </Badge>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{t('dashboard_eyebrow', 'SMART FARM MINI')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {t('dashboard_title', 'Tổng quan khu vườn')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {t('dashboard_subtitle', 'Một không gian để theo dõi cây trồng và chăm sóc khu vườn mỗi ngày.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {signalRStatusBadge()}
          {lastTelemetryTime && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock className="size-3" />
              {t('live_updated_at', 'Cập nhật lúc')}{' '}
              {lastTelemetryTime.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
            </span>
          )}
        </div>
      </div>

      {/* Hero Banner with Live Gateway Status */}
      <section
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 p-6 text-white md:p-8 shadow-md"
        aria-labelledby="welcome-title"
      >
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              <Radio className={`size-3.5 ${isConnected ? 'text-emerald-300 animate-pulse' : 'text-slate-300'}`} />
              <span>
                {isConnected
                  ? language === 'vi'
                    ? 'DỮ LIỆU TỨC THỜI HOẠT ĐỘNG'
                    : 'LIVE REAL-TIME STREAMING'
                  : language === 'vi'
                  ? 'ĐANG KẾT NỐI MÁY CHỦ'
                  : 'CONNECTING TO SERVER'}
              </span>
            </div>
            <h2 id="welcome-title" className="mt-3 text-xl font-bold md:text-2xl text-white">
              {t('dashboard_banner_title', 'Bắt đầu từ một khu vườn nhỏ.')}
            </h2>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-emerald-100/90">
              {t(
                'dashboard_banner_desc',
                'Hệ thống IoT cập nhật chỉ số đất, nước và không khí tức thời qua SignalR. Quản lý tưới tiêu chính xác cho từng chậu cây.'
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link
              to="/sensors"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <span>{language === 'vi' ? 'Xem cảm biến chi tiết' : 'View Sensor Telemetry'}</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/irrigation"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              <span>{language === 'vi' ? 'Điều khiển tưới cây' : 'Irrigation Controls'}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>{language === 'vi' ? 'Chỉ số môi trường thời gian thực' : 'Real-time Environmental Telemetry'}</span>
          </h2>
          {isTelemetryFlashing && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary animate-pulse">
              <span className="size-2 rounded-full bg-primary" />
              <span>{t('live_badge', 'Trực tiếp')}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Soil Moisture */}
          <div
            className={`rounded-2xl border p-4 transition-all duration-300 ${
              isTelemetryFlashing
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {language === 'vi' ? 'Độ ẩm đất' : 'Soil Moisture'}
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sprout className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {formatTelemetryValue(summary?.sensors?.averageSoilMoisture, '%')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {language === 'vi' ? 'Mức tối ưu: 60 - 80%' : 'Optimal: 60 - 80%'}
            </p>
          </div>

          {/* Air Temperature */}
          <div
            className={`rounded-2xl border p-4 transition-all duration-300 ${
              isTelemetryFlashing
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {language === 'vi' ? 'Nhiệt độ không khí' : 'Air Temp'}
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Thermometer className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {formatTelemetryValue(summary?.sensors?.averageAirTemperature, '°C')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {language === 'vi' ? 'DHT22 Sensor' : 'DHT22 Sensor'}
            </p>
          </div>

          {/* Air Humidity */}
          <div
            className={`rounded-2xl border p-4 transition-all duration-300 ${
              isTelemetryFlashing
                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {language === 'vi' ? 'Độ ẩm không khí' : 'Air Humidity'}
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Wind className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {formatTelemetryValue(summary?.sensors?.averageAirHumidity, '%')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {language === 'vi' ? 'Độ ẩm môi trường' : 'Ambient humidity'}
            </p>
          </div>

          {/* Water Temperature */}
          <div
            className={`rounded-2xl border p-4 transition-all duration-300 ${
              isTelemetryFlashing
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {language === 'vi' ? 'Nhiệt độ nước' : 'Water Temp'}
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Droplets className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {formatTelemetryValue(summary?.sensors?.averageWaterTemperature, '°C')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {language === 'vi' ? 'DS18B20 Probe' : 'DS18B20 Probe'}
            </p>
          </div>

          {/* Water Level */}
          <div
            className={`col-span-2 lg:col-span-1 rounded-2xl border p-4 transition-all duration-300 ${
              isTelemetryFlashing
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {language === 'vi' ? 'Mực nước bồn' : 'Water Level'}
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Waves className="size-4" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {formatTelemetryValue(summary?.sensors?.averageWaterLevel, '%')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {language === 'vi' ? 'Bình chứa tưới' : 'Reservoir status'}
            </p>
          </div>
        </div>
      </div>

      {/* Devices & Actuators Overview Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Device Status Card */}
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <span>{t('nav_devices', 'Thiết bị')}</span>
            </h3>
            <Link to="/devices" className="text-xs text-primary font-semibold hover:underline">
              {language === 'vi' ? 'Quản lý' : 'Manage'} →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-line bg-canvas p-3">
              <div className="flex items-center gap-2">
                <StatusDot status="online" size="sm" />
                <span className="text-xs text-muted">Online</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">
                {summary?.devices?.onlineDevices ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-canvas p-3">
              <div className="flex items-center gap-2">
                <StatusDot status="offline" size="sm" />
                <span className="text-xs text-muted">Offline</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">
                {summary?.devices?.offlineDevices ?? 0}
              </p>
            </div>
          </div>
        </section>

        {/* Pump & Actuators Card */}
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Droplets className="size-4 text-primary" />
              <span>{t('nav_irrigation', 'Tưới nước')}</span>
            </h3>
            <Link to="/irrigation" className="text-xs text-primary font-semibold hover:underline">
              {language === 'vi' ? 'Lịch tưới' : 'Rules'} →
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-canvas p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">{language === 'vi' ? 'Trạng thái bơm tưới' : 'Pump Status'}</p>
              <p className="text-sm font-bold text-ink mt-1">
                {summary?.isAnyPumpRunning
                  ? language === 'vi' ? 'Đang bơm tưới' : 'Pump Running'
                  : language === 'vi' ? 'Đang tạm dừng' : 'Idle'}
              </p>
            </div>
            <StatusDot
              status={summary?.isAnyPumpRunning ? 'online' : 'offline'}
              label={summary?.isAnyPumpRunning ? 'Active' : 'Standby'}
              size="md"
            />
          </div>
        </section>

        {/* Real-time Gateway Hub Card */}
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              <span>SignalR Gateway</span>
            </h3>
            <span className="text-[11px] font-mono text-muted">/hubs/sensors</span>
          </div>

          <div className="rounded-xl border border-line bg-canvas p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Trạng thái kết nối:' : 'Connection:'}</span>
              <span className="font-semibold capitalize text-ink">{connectionStatus}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Giao thức:' : 'Protocol:'}</span>
              <span className="font-mono text-ink">WebSocket / JWT</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
