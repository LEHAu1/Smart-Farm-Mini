import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceDto } from '../../types/device';
import type { PageResult } from '../../types/common';
import {
  SensorType,
  type SensorTelemetryDto,
  type SensorHistoryDto,
} from '../../types/sensor';
import { Badge } from '../../components/common/Badge';
import {
  Sprout,
  Thermometer,
  Wind,
  Droplets,
  Waves,
  Radio,
  AlertTriangle,
} from 'lucide-react';

type TimeRangeFilter = '1h' | '6h' | '24h' | '7d' | '30d';

export default function SensorsPage() {
  const { t, language } = useLanguage();
  const { isConnected, onTelemetry } = useSensorHub();

  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [telemetry, setTelemetry] = useState<SensorTelemetryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Time filter & chart states
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('24h');
  const [activeSensorType, setActiveSensorType] = useState<SensorType>(SensorType.SoilMoisture);
  const [historyData, setHistoryData] = useState<SensorHistoryDto | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const isDeviceOnline = Boolean(selectedDevice?.isOnline);

  // 1. Load devices list
  useEffect(() => {
    let isMounted = true;
    async function fetchDevices() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceDto>>('/api/devices?pageSize=50');
        if (isMounted && data?.items?.length) {
          setDevices(data.items);
          setSelectedDeviceId(data.items[0].id);
        }
      } catch {
        // Handled via empty state
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch latest telemetry for selected device
  const fetchTelemetry = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    try {
      const { data } = await apiClient.get<SensorTelemetryDto>(
        `/api/devices/${deviceId}/sensors/latest`
      );
      if (data) {
        setTelemetry(data);
      }
    } catch {
      setTelemetry(null);
    }
  }, []);

  // 3. Fetch historical sensor data from real API
  const fetchHistory = useCallback(
    async (deviceId: string, type: SensorType, range: TimeRangeFilter) => {
      if (!deviceId) return;
      setIsHistoryLoading(true);

      const now = new Date();
      let fromDate = new Date();
      switch (range) {
        case '1h':
          fromDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      try {
        const { data } = await apiClient.get<SensorHistoryDto>(
          `/api/devices/${deviceId}/sensors/history`,
          {
            params: {
              sensorType: type,
              fromUtc: fromDate.toISOString(),
              toUtc: now.toISOString(),
            },
          }
        );
        setHistoryData(data || null);
      } catch {
        setHistoryData(null);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedDeviceId) {
      fetchTelemetry(selectedDeviceId);
      fetchHistory(selectedDeviceId, activeSensorType, timeFilter);
    }
  }, [selectedDeviceId, activeSensorType, timeFilter, fetchTelemetry, fetchHistory]);

  // 4. Real-time updates via SignalR
  useEffect(() => {
    const unsub = onTelemetry((data) => {
      if (data.deviceId === selectedDeviceId) {
        setTelemetry(data);
      }
    });

    return () => {
      unsub();
    };
  }, [selectedDeviceId, onTelemetry]);

  const formatReading = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined) return '--';
    return `${Number(val).toFixed(1)} ${unit}`;
  };

  // SVG Chart rendering calculation based on real data points
  const chartPoints = useMemo(() => {
    if (!historyData?.dataPoints || historyData.dataPoints.length === 0) return null;

    const points = historyData.dataPoints;
    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 200;
    const padding = 20;

    const coords = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((p.value - minVal) / range) * (height - 2 * padding);
      return { x, y, value: p.value, time: p.timestampUtc };
    });

    const pathString = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaString = `${pathString} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return { coords, pathString, areaString, minVal, maxVal, width, height };
  }, [historyData]);

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
          <Sprout className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">
          {language === 'vi' ? 'Chưa có thiết bị nào' : 'No Devices Registered'}
        </h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          {language === 'vi'
            ? 'Vui lòng thêm thiết bị phần cứng tại trang Thiết bị để theo dõi các thông số cảm biến.'
            : 'Please add a device in the Devices page to start monitoring sensor readings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Device Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow">{t('nav_sensors', 'GIÁM SÁT CẢM BIẾN')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Thông số môi trường chi tiết' : 'Environmental Sensor Telemetry'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {language === 'vi'
              ? 'Theo dõi độ ẩm đất, nhiệt độ, độ ẩm không khí và mực nước bồn tức thời.'
              : 'Real-time readings for soil moisture, air climate, and reservoir water level.'}
          </p>
        </div>

        {/* Device Picker & Live Indicator */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <select
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

          {isConnected && (
            <Badge variant="success" showDot className="hidden xs:inline-flex">
              {language === 'vi' ? 'Thời gian thực' : 'Live SignalR'}
            </Badge>
          )}
        </div>
      </div>

      {/* Offline Alert when Device is disconnected */}
      {!isDeviceOnline && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold">
              {language === 'vi' ? 'Thiết bị đang Ngoại tuyến (Offline)' : 'Device is Currently Offline'}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              {language === 'vi'
                ? 'Các thông số bên dưới là giá trị ghi nhận cuối cùng trước khi mất kết nối. Dữ liệu thời gian thực sẽ tiếp tục khi thiết bị online trở lại.'
                : 'Readings below reflect the last recorded values before disconnection. Live telemetry resumes once the device reconnects.'}
            </p>
          </div>
        </div>
      )}

      {/* Live Sensor Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Soil Moisture */}
        <div
          onClick={() => setActiveSensorType(SensorType.SoilMoisture)}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeSensorType === SensorType.SoilMoisture
              ? 'ring-2 ring-primary border-primary bg-primary/20 backdrop-blur-[var(--glass-blur)]'
              : 'card-3d card-3d-interactive'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider text-shadow-contrast">
              {language === 'vi' ? 'Độ ẩm đất' : 'Soil Moisture'}
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 shadow-xs">
              <Sprout className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink tabular-nums sensor-value-3d">
              {formatReading(telemetry?.soilMoisture, '%')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted text-backdrop-local font-medium inline-block">
            {language === 'vi' ? 'Tối ưu: 60 - 80%' : 'Optimal: 60 - 80%'}
          </p>
        </div>

        {/* Air Temperature */}
        <div
          onClick={() => setActiveSensorType(SensorType.AirTemperature)}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeSensorType === SensorType.AirTemperature
              ? 'ring-2 ring-primary border-primary bg-primary/20 backdrop-blur-[var(--glass-blur)]'
              : 'card-3d card-3d-interactive'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider text-shadow-contrast">
              {language === 'vi' ? 'Nhiệt độ khí' : 'Air Temp'}
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20 shadow-xs">
              <Thermometer className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink tabular-nums sensor-value-3d">
              {formatReading(telemetry?.airTemperature, '°C')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted text-backdrop-local font-medium inline-block">DHT22 Ambient</p>
        </div>

        {/* Air Humidity */}
        <div
          onClick={() => setActiveSensorType(SensorType.AirHumidity)}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeSensorType === SensorType.AirHumidity
              ? 'ring-2 ring-primary border-primary bg-primary/20 backdrop-blur-[var(--glass-blur)]'
              : 'card-3d card-3d-interactive'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider text-shadow-contrast">
              {language === 'vi' ? 'Độ ẩm khí' : 'Air Humidity'}
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500 border border-cyan-500/20 shadow-xs">
              <Wind className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink tabular-nums sensor-value-3d">
              {formatReading(telemetry?.airHumidity, '%')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted text-backdrop-local font-medium inline-block">DHT22 Humidity</p>
        </div>

        {/* Water Temperature */}
        <div
          onClick={() => setActiveSensorType(SensorType.WaterTemperature)}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeSensorType === SensorType.WaterTemperature
              ? 'ring-2 ring-primary border-primary bg-primary/20 backdrop-blur-[var(--glass-blur)]'
              : 'card-3d card-3d-interactive'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider text-shadow-contrast">
              {language === 'vi' ? 'Nhiệt độ nước' : 'Water Temp'}
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/20 shadow-xs">
              <Droplets className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink tabular-nums sensor-value-3d">
              {formatReading(telemetry?.waterTemperature, '°C')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted text-backdrop-local font-medium inline-block">DS18B20 Probe</p>
        </div>

        {/* Water Level */}
        <div
          onClick={() => setActiveSensorType(SensorType.WaterLevel)}
          className={`col-span-2 lg:col-span-1 cursor-pointer rounded-2xl border p-4 transition-all ${
            activeSensorType === SensorType.WaterLevel
              ? 'ring-2 ring-primary border-primary bg-primary/20 backdrop-blur-[var(--glass-blur)]'
              : 'card-3d card-3d-interactive'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider text-shadow-contrast">
              {language === 'vi' ? 'Mực nước bồn' : 'Water Level'}
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/20 shadow-xs">
              <Waves className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              {formatReading(telemetry?.waterLevel, '%')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {language === 'vi' ? 'Bình chứa tưới' : 'Reservoir Tank'}
          </p>
        </div>
      </div>

      {/* Historical Trend Chart Section */}
      <section className="panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-base font-bold text-ink">
              {language === 'vi' ? 'Biểu đồ diễn biến lịch sử' : 'Historical Trend Analysis'}
            </h2>
            <p className="text-xs text-muted">
              {language === 'vi'
                ? 'Dữ liệu đo đạc thực tế từ cơ sở dữ liệu hệ thống.'
                : 'Recorded physical telemetry from database.'}
            </p>
          </div>

          {/* Time Filter Buttons (1h, 6h, 24h, 7d, 30d) */}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-canvas p-1 self-start sm:self-auto">
            {(['1h', '6h', '24h', '7d', '30d'] as TimeRangeFilter[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeFilter(range)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${timeFilter === range
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-muted hover:text-ink'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Real Chart Rendering or Empty State */}
        <div className="relative min-h-[220px] flex items-center justify-center">
          {isHistoryLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{language === 'vi' ? 'Đang tải lịch sử...' : 'Loading history...'}</span>
            </div>
          ) : !chartPoints ? (
            <div className="py-12 text-center text-xs text-muted max-w-md">
              <Radio className="mx-auto size-8 text-muted/50 mb-2" />
              <p className="font-semibold text-ink">
                {language === 'vi' ? 'Chưa có bản ghi dữ liệu cảm biến' : 'No telemetry recorded for this range'}
              </p>
              <p className="text-[11px] text-muted mt-1">
                {language === 'vi'
                  ? 'Hệ thống không giả lập số liệu. Khi mạch ESP32 gửi dữ liệu qua MQTT, biểu đồ sẽ hiển thị đường xu hướng thực tế.'
                  : 'Real IoT data will populate here as soon as ESP32 publishes readings via MQTT.'}
              </p>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-muted px-2">
                <span>{language === 'vi' ? 'Thấp nhất:' : 'Min:'} {chartPoints.minVal} {historyData?.unit}</span>
                <span>{language === 'vi' ? 'Cao nhất:' : 'Max:'} {chartPoints.maxVal} {historyData?.unit}</span>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full overflow-hidden rounded-xl border border-line bg-canvas/50 p-2">
                <svg
                  viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                  className="w-full h-48 overflow-visible"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path d={chartPoints.areaString} fill="url(#chartGradient)" />

                  {/* Main Line */}
                  <path
                    d={chartPoints.pathString}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points */}
                  {chartPoints.coords.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      className="fill-white stroke-emerald-600 stroke-2"
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
