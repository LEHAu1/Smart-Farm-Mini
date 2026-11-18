import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import type { SensorTelemetryDto } from '../../types/sensor';
import { Badge } from '../../components/common/Badge';
import { StatusDot } from '../../components/common/StatusDot';
import {
  Sprout,
  Thermometer,
  Wind,
  Droplets,
  Waves,
  Cpu,
  Clock,
  Radio,
} from 'lucide-react';

export default function SensorsPage() {
  const { t, language } = useLanguage();
  const { isConnected, onTelemetry } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [telemetry, setTelemetry] = useState<SensorTelemetryDto | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLivePulsing, setIsLivePulsing] = useState<boolean>(false);

  // 1. Load devices list
  useEffect(() => {
    let isMounted = true;
    async function fetchDevices() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/Devices', {
          params: { pageNumber: 1, pageSize: 50 },
        });
        if (isMounted && data?.items?.length) {
          setDevices(data.items);
          setSelectedDeviceId(data.items[0].id);
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

  // 2. Fetch initial telemetry when selected device changes
  useEffect(() => {
    if (!selectedDeviceId) return;
    let isMounted = true;

    async function fetchLatest() {
      try {
        const { data } = await apiClient.get<SensorTelemetryDto>('/api/Sensors/latest', {
          params: { deviceId: selectedDeviceId },
        });
        if (isMounted && data) {
          setTelemetry(data);
          if (data.lastUpdatedAtUtc) {
            setLastUpdated(new Date(data.lastUpdatedAtUtc));
          }
        }
      } catch {
        // No telemetry yet
      }
    }

    fetchLatest();
    return () => {
      isMounted = false;
    };
  }, [selectedDeviceId]);

  // 3. Listen for SignalR real-time telemetry updates
  useEffect(() => {
    const unsub = onTelemetry((liveData) => {
      // If matches currently selected device or if only one device
      if (!selectedDeviceId || liveData.deviceId === selectedDeviceId) {
        setTelemetry(liveData);
        setLastUpdated(new Date());
        setIsLivePulsing(true);
        setTimeout(() => setIsLivePulsing(false), 1500);
      }
    });

    return () => {
      unsub();
    };
  }, [selectedDeviceId, onTelemetry]);

  const formatVal = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined) return '--';
    return `${Number(val).toFixed(1)} ${unit}`;
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{t('nav_sensors', 'Cảm biến')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Giám sát chỉ số môi trường' : 'Environmental Telemetry'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {t('placeholder_sensors_desc', 'Giám sát chỉ số môi trường: nhiệt độ, độ ẩm đất, độ ẩm không khí.')}
          </p>
        </div>

        {/* Live status badge */}
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
          {lastUpdated && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock className="size-3" />
              {t('live_updated_at', 'Cập nhật lúc')}{' '}
              {lastUpdated.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
            </span>
          )}
        </div>
      </div>

      {/* Device Selector toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-subtle text-primary">
            <Cpu className="size-5" />
          </span>
          <div>
            <label htmlFor="device-selector" className="text-xs font-semibold text-muted block">
              {language === 'vi' ? 'Chọn chậu cây / thiết bị IoT' : 'Select Plant Pot / IoT Node'}
            </label>
            <select
              id="device-selector"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="mt-0.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {devices.length === 0 ? (
                <option value="">{language === 'vi' ? 'Chưa có thiết bị nào' : 'No devices found'}</option>
              ) : (
                devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.deviceCode})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedDevice && (
          <div className="flex items-center gap-3">
            <StatusDot
              status={selectedDevice.isOnline ? 'online' : 'offline'}
              label={selectedDevice.isOnline ? 'Node Online' : 'Node Offline'}
              size="md"
            />
            {isLivePulsing && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary animate-pulse">
                <Radio className="size-3.5" />
                <span>{t('live_badge', 'Trực tiếp')}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sensor Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Soil Moisture */}
        <div
          className={`rounded-2xl border p-5 transition-all duration-300 ${
            isLivePulsing ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {language === 'vi' ? 'Độ ẩm đất' : 'Soil Moisture'}
              </span>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {formatVal(telemetry?.soilMoisture, '%')}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sprout className="size-6" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
            <span>{language === 'vi' ? 'Cảm biến điện trở đất' : 'Capacitive Soil Sensor'}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">60 - 80% OK</span>
          </div>
        </div>

        {/* Air Temperature */}
        <div
          className={`rounded-2xl border p-5 transition-all duration-300 ${
            isLivePulsing ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {language === 'vi' ? 'Nhiệt độ không khí' : 'Air Temperature'}
              </span>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {formatVal(telemetry?.airTemperature, '°C')}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Thermometer className="size-6" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
            <span>DHT22 Ambient Sensor</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">24 - 32°C OK</span>
          </div>
        </div>

        {/* Air Humidity */}
        <div
          className={`rounded-2xl border p-5 transition-all duration-300 ${
            isLivePulsing ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {language === 'vi' ? 'Độ ẩm không khí' : 'Air Humidity'}
              </span>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {formatVal(telemetry?.airHumidity, '%')}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Wind className="size-6" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
            <span>DHT22 Relative Humidity</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">55 - 85% OK</span>
          </div>
        </div>

        {/* Water Temperature */}
        <div
          className={`rounded-2xl border p-5 transition-all duration-300 ${
            isLivePulsing ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {language === 'vi' ? 'Nhiệt độ nước tưới' : 'Water Temperature'}
              </span>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {formatVal(telemetry?.waterTemperature, '°C')}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Droplets className="size-6" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
            <span>DS18B20 Waterproof Probe</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">22 - 28°C OK</span>
          </div>
        </div>

        {/* Water Level */}
        <div
          className={`rounded-2xl border p-5 transition-all duration-300 ${
            isLivePulsing ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {language === 'vi' ? 'Mực nước bình chứa' : 'Water Reservoir Level'}
              </span>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {formatVal(telemetry?.waterLevel, '%')}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Waves className="size-6" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
            <span>Ultrasonic Tank Sensor</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">&gt; 30% OK</span>
          </div>
        </div>

        {/* SignalR Connection Telemetry Hub Info */}
        <div className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Radio className="size-3.5 text-primary" />
              <span>Realtime SignalR Hub</span>
            </span>
            <p className="mt-2 text-lg font-bold text-ink">
              {isConnected ? (language === 'vi' ? 'Đang nhận luồng tức thời' : 'Streaming Telemetry') : (language === 'vi' ? 'Chưa kết nối' : 'Disconnected')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60 text-xs text-muted flex items-center justify-between">
            <span>Event: TelemetryUpdated</span>
            <span className="font-mono text-primary">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
