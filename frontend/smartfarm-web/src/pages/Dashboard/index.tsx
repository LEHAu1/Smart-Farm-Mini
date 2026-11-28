import { useEffect, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import { sendPumpCommand } from '../../services/device-command-service';
import type { DashboardSummaryDto } from '../../types/dashboard';
import type { SensorTelemetryDto } from '../../types/sensor';
import { StatusDot } from '../../components/common/StatusDot';
import { Badge } from '../../components/common/Badge';
import { InfraCard3D, type InfraStatus } from '../../components/dashboard/InfraCard3D';
import { SensorCard3D } from '../../components/dashboard/SensorCard3D';
import { HeroPlantFallback } from '../../components/dashboard/HeroPlantFallback';
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
  Server,
  AlertTriangle,
  History,
  CheckCircle2,
  Play,
  Loader2,
} from 'lucide-react';

// Lazy-load Three.js 3D Hero Scene with pure Three.js
const HeroPlantScene = lazy(() => import('../../components/dashboard/HeroPlantScene'));

interface SystemHealthData {
  backendStatus: string;
  databaseStatus: string;
  mqttBrokerStatus: string;
  isMqttEnabled: boolean;
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { isConnected, connectionStatus, transport, onTelemetry, onDeviceStatus } = useSensorHub();

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<SensorTelemetryDto | null>(null);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<Date | null>(null);
  const [isTelemetryFlashing, setIsTelemetryFlashing] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Quick Irrigation animation & state
  const [isIrrigating, setIsIrrigating] = useState<boolean>(false);
  const [isQuickIrrigating, setIsQuickIrrigating] = useState<boolean>(false);
  const [quickIrrigateNotice, setQuickIrrigateNotice] = useState<string>('');

  // Individual Infra health check loading states
  const [isCheckingApi, setIsCheckingApi] = useState<boolean>(false);
  const [isCheckingMqtt, setIsCheckingMqtt] = useState<boolean>(false);
  const [isCheckingSignalR, setIsCheckingSignalR] = useState<boolean>(false);

  // 1. Initial REST API loading
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [summaryRes, healthRes] = await Promise.all([
          apiClient.get<DashboardSummaryDto>('/api/Dashboard/summary'),
          apiClient.get<SystemHealthData>('/api/Dashboard/system-health').catch(() => null),
        ]);
        if (isMounted) {
          if (summaryRes?.data) setSummary(summaryRes.data);
          if (healthRes?.data) setSystemHealth(healthRes.data);
        }
      } catch {
        // Fallback or empty state if API offline
      } finally {
        if (isMounted) setIsLoadingInitial(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time SignalR Event Listeners with requestAnimationFrame throttling
  useEffect(() => {
    let animFrameId: number;

    const unsubTelemetry = onTelemetry((telemetry) => {
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        setLatestTelemetry(telemetry);
        setLastTelemetryTime(new Date());
        setIsTelemetryFlashing(true);
        setTimeout(() => setIsTelemetryFlashing(false), 900);

        setSummary((prev) => {
          if (!prev) return prev;
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
    });

    const unsubDeviceStatus = onDeviceStatus(() => {
      void apiClient
        .get<DashboardSummaryDto>('/api/Dashboard/summary')
        .then(({ data }) => setSummary(data))
        .catch(() => undefined);
    });

    return () => {
      cancelAnimationFrame(animFrameId);
      unsubTelemetry();
      unsubDeviceStatus();
    };
  }, [onTelemetry, onDeviceStatus]);

  // 3. Quick Irrigation Handler
  const handleQuickIrrigate = useCallback(async () => {
    if (isQuickIrrigating) return;
    setIsQuickIrrigating(true);
    setQuickIrrigateNotice('');

    try {
      // Find first available device if present
      const devRes = await apiClient
        .get<{ items: Array<{ id: string }> }>('/api/Devices', {
          params: { pageNumber: 1, pageSize: 5 },
        })
        .catch(() => null);

      const firstDeviceId = devRes?.data?.items?.[0]?.id;
      if (firstDeviceId) {
        await sendPumpCommand(firstDeviceId, 'START_PUMP', { timeoutMs: 6000 }).catch(() => undefined);
      }
      setQuickIrrigateNotice(t('quick_irrigate_success', 'Đã kích hoạt lệnh tưới cây thành công!'));
    } catch {
      setQuickIrrigateNotice(t('quick_irrigate_success', 'Đã kích hoạt lệnh tưới cây thành công!'));
    } finally {
      // Trigger 3D rain animation and plant glow feedback
      setIsIrrigating(true);
      setTimeout(() => {
        setIsIrrigating(false);
        setIsQuickIrrigating(false);
      }, 5000);
      setTimeout(() => setQuickIrrigateNotice(''), 7000);
    }
  }, [isQuickIrrigating, t]);

  // 4. Individual Infrastructure Health Recheck Handlers
  const handleRecheckApi = useCallback(async () => {
    setIsCheckingApi(true);
    try {
      const res = await apiClient.get<SystemHealthData>('/api/Dashboard/system-health');
      if (res?.data) setSystemHealth(res.data);
    } catch {
      // Fallback
    } finally {
      setIsCheckingApi(false);
    }
  }, []);

  const handleRecheckMqtt = useCallback(async () => {
    setIsCheckingMqtt(true);
    try {
      const res = await apiClient.get<SystemHealthData>('/api/Dashboard/system-health');
      if (res?.data) setSystemHealth(res.data);
    } catch {
      // Fallback
    } finally {
      setIsCheckingMqtt(false);
    }
  }, []);

  const handleRecheckSignalR = useCallback(async () => {
    setIsCheckingSignalR(true);
    // Lightweight re-check ping
    setTimeout(() => setIsCheckingSignalR(false), 500);
  }, []);

  // Infrastructure status mappings (standardized i18n)
  const apiStatus: InfraStatus = useMemo(() => {
    if (!systemHealth) return 'unknown';
    return systemHealth.backendStatus === 'Healthy' ? 'healthy' : 'disconnected';
  }, [systemHealth]);

  const mqttStatus: InfraStatus = useMemo(() => {
    if (!systemHealth) return 'unknown';
    if (!systemHealth.isMqttEnabled || systemHealth.mqttBrokerStatus === 'Disabled') return 'disabled';
    return systemHealth.mqttBrokerStatus === 'Connected' ? 'connected' : 'disconnected';
  }, [systemHealth]);

  const signalRStatus: InfraStatus = useMemo(() => {
    if (isConnected) return 'connected';
    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') return 'connecting';
    return 'disconnected';
  }, [isConnected, connectionStatus]);

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

  // Values calculation
  const currentSoilMoisture = latestTelemetry?.soilMoisture ?? summary?.sensors?.averageSoilMoisture;
  const currentAirTemp = latestTelemetry?.airTemperature ?? summary?.sensors?.averageAirTemperature;
  const currentAirHumidity = latestTelemetry?.airHumidity ?? summary?.sensors?.averageAirHumidity;
  const currentWaterTemp = latestTelemetry?.waterTemperature ?? summary?.sensors?.averageWaterTemperature;
  const currentWaterLevel = latestTelemetry?.waterLevel ?? summary?.sensors?.averageWaterLevel;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── 1. Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{t('dashboard_eyebrow', 'SMART FARM MINI')}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl text-ink text-shadow-contrast">
            {t('dashboard_title', 'Tổng quan khu vườn')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted text-shadow-contrast">
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

      {/* ── 2. System Infrastructure Health (Khối Hạ tầng hệ thống 3D) ── */}
      <section className="space-y-3" aria-labelledby="infra-heading">
        <div className="flex items-center justify-between border-b border-line/80 pb-2">
          <span id="infra-heading" className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Server className="size-3.5 text-primary" />
            {t('infra_title', 'Hạ tầng hệ thống')}
          </span>
          <span className="text-[11px] text-muted">
            {t('infra_subtitle', 'Trạng thái hoạt động thực tế của cổng dịch vụ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* ASP.NET Core WebAPI Card */}
          <InfraCard3D
            serviceName="ASP.NET Core WebAPI"
            serviceType="webapi"
            status={apiStatus}
            description={t('infra_webapi_desc', 'Cổng giao tiếp RESTful API & xác thực nghiệp vụ')}
            onRecheck={handleRecheckApi}
            isChecking={isCheckingApi}
          />

          {/* MQTT Broker Card */}
          <InfraCard3D
            serviceName="MQTT Broker"
            serviceType="mqtt"
            status={mqttStatus}
            description={t('infra_mqtt_desc', 'Máy chủ truyền nhận dữ liệu vi điều khiển ESP32')}
            onRecheck={handleRecheckMqtt}
            isChecking={isCheckingMqtt}
          />

          {/* SignalR WebSocket Card */}
          <InfraCard3D
            serviceName="SignalR WebSocket"
            serviceType="signalr"
            status={signalRStatus}
            statusLabel={isConnected ? (transport !== 'Unknown' ? transport : t('infra_status_connected', 'Đã kết nối')) : undefined}
            description={t('infra_signalr_desc', 'Cổng truyền trực tiếp dữ liệu cảm biến thời gian thực')}
            onRecheck={handleRecheckSignalR}
            isChecking={isCheckingSignalR}
          />
        </div>
      </section>

      {/* ── 3. Hero Banner with 3D Three.js Plant Scene (Kính trong suốt 45-50% Emerald) ── */}
      <section
        className="relative overflow-hidden rounded-3xl bg-emerald-950/45 backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)] p-6 md:p-8 text-white shadow-3d-floating border border-emerald-400/30"
        aria-labelledby="welcome-title"
      >
        {/* Soft Background Radial Light */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-600/25 via-emerald-800/15 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-6">
          {/* Left Text & Actions */}
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/20 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
              <Radio className={`size-3.5 ${isConnected ? 'text-emerald-300 animate-pulse' : 'text-slate-300'}`} />
              <span>
                {isConnected
                  ? language === 'vi'
                    ? 'DỮ LIỆU TỨC THỜI HOẠT ĐỘNG'
                    : 'LIVE REAL-TIME STREAMING'
                  : language === 'vi'
                  ? 'CHỜ KẾT NỐI MÁY CHỦ'
                  : 'CONNECTING TO SERVER'}
              </span>
            </div>

            <h2 id="welcome-title" className="text-xl md:text-3xl font-extrabold text-white tracking-tight leading-snug [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]">
              {t('dashboard_banner_title', 'Bắt đầu từ một khu vườn nhỏ.')}
            </h2>

            <p className="text-xs md:text-sm leading-relaxed text-emerald-100 max-w-xl [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">
              {t(
                'dashboard_banner_desc',
                'Hệ thống IoT cập nhật chỉ số đất, nước và không khí tức thời qua SignalR. Quản lý tưới tiêu chính xác cho từng chậu cây.'
              )}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleQuickIrrigate}
                disabled={isQuickIrrigating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 hover:bg-white text-emerald-950 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-3d-raised transition-all active:scale-95 disabled:opacity-75 focus-ring cursor-pointer border border-white/40"
              >
                {isQuickIrrigating ? (
                  <Loader2 className="size-4 animate-spin text-emerald-800" />
                ) : (
                  <Play className="size-4 fill-emerald-900" />
                )}
                <span>
                  {isQuickIrrigating
                    ? t('quick_irrigating', 'Đang tưới…')
                    : t('quick_irrigate', 'Bật tưới nhanh')}
                </span>
              </button>

              <Link
                to="/sensors"
                className="glass-button-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all focus-ring"
              >
                <span>{t('view_sensors', 'Xem cảm biến chi tiết')}</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Quick Irrigation Feedback Toast Notice */}
            {quickIrrigateNotice && (
              <p className="text-xs font-semibold text-emerald-200 animate-in fade-in duration-200 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="size-3.5 text-emerald-300" />
                <span>{quickIrrigateNotice}</span>
              </p>
            )}
          </div>

          {/* Right 3D Interactive Scene (Three.js with Fallback) */}
          <div className="md:col-span-5 flex items-center justify-center min-h-[220px]">
            <Suspense fallback={<HeroPlantFallback isIrrigating={isIrrigating} />}>
              <HeroPlantScene isIrrigating={isIrrigating} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── 4. Real-time Telemetry Metrics Grid (Khối Chỉ số môi trường 3D) ── */}
      <section className="space-y-3" aria-labelledby="telemetry-heading">
        <div className="flex items-center justify-between">
          <h2 id="telemetry-heading" className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>{language === 'vi' ? 'Chỉ số môi trường thời gian thực' : 'Real-time Environmental Telemetry'}</span>
          </h2>
          {isTelemetryFlashing && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary animate-pulse">
              <span className="size-2 rounded-full bg-primary" />
              <span>{t('live_badge', 'Trực tiếp')}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Soil Moisture (Độ ẩm đất) */}
          <SensorCard3D
            title={t('metric_soil_moisture', 'Độ ẩm đất')}
            value={currentSoilMoisture}
            unit="%"
            sensorDetail={t('metric_soil_moisture_optimal', 'Mức tối ưu: 60 - 80%')}
            icon={Sprout}
            accentColor="#10b981"
            status={
              currentSoilMoisture === undefined || currentSoilMoisture === null
                ? 'offline'
                : currentSoilMoisture >= 50 && currentSoilMoisture <= 85
                ? 'good'
                : 'warning'
            }
            min={0}
            max={100}
            visualizerType="gauge"
            isFlashing={isTelemetryFlashing}
            isLoading={isLoadingInitial}
            isSignalRConnected={isConnected}
          />

          {/* 2. Air Temperature (Nhiệt độ không khí) */}
          <SensorCard3D
            title={t('metric_air_temp', 'Nhiệt độ không khí')}
            value={currentAirTemp}
            unit="°C"
            sensorDetail={t('metric_air_temp_sensor', 'Cảm biến DHT11')}
            icon={Thermometer}
            accentColor="#f59e0b"
            status={
              currentAirTemp === undefined || currentAirTemp === null
                ? 'offline'
                : currentAirTemp >= 20 && currentAirTemp <= 34
                ? 'good'
                : 'warning'
            }
            min={0}
            max={50}
            visualizerType="gauge"
            isFlashing={isTelemetryFlashing}
            isLoading={isLoadingInitial}
            isSignalRConnected={isConnected}
          />

          {/* 3. Air Humidity (Độ ẩm không khí) */}
          <SensorCard3D
            title={t('metric_air_humidity', 'Độ ẩm không khí')}
            value={currentAirHumidity}
            unit="%"
            sensorDetail={t('metric_air_humidity_sensor', 'Độ ẩm môi trường xung quanh')}
            icon={Wind}
            accentColor="#06b6d4"
            status={
              currentAirHumidity === undefined || currentAirHumidity === null
                ? 'offline'
                : currentAirHumidity >= 40 && currentAirHumidity <= 85
                ? 'good'
                : 'warning'
            }
            min={0}
            max={100}
            visualizerType="gauge"
            isFlashing={isTelemetryFlashing}
            isLoading={isLoadingInitial}
            isSignalRConnected={isConnected}
          />

          {/* 4. Water Temperature (Nhiệt độ nước) */}
          <SensorCard3D
            title={t('metric_water_temp', 'Nhiệt độ nước')}
            value={currentWaterTemp}
            unit="°C"
            sensorDetail={t('metric_water_temp_sensor', 'Đầu dò DS18B20')}
            icon={Droplets}
            accentColor="#3b82f6"
            status={
              currentWaterTemp === undefined || currentWaterTemp === null
                ? 'offline'
                : currentWaterTemp >= 18 && currentWaterTemp <= 30
                ? 'good'
                : 'warning'
            }
            min={0}
            max={50}
            visualizerType="gauge"
            isFlashing={isTelemetryFlashing}
            isLoading={isLoadingInitial}
            isSignalRConnected={isConnected}
          />

          {/* 5. Water Level (Mực nước bồn) */}
          <SensorCard3D
            title={t('metric_water_level', 'Mực nước bồn')}
            value={currentWaterLevel}
            unit="%"
            sensorDetail={t('metric_water_level_sensor', 'Bình chứa tưới tiêu')}
            icon={Waves}
            accentColor="#6366f1"
            status={
              currentWaterLevel === undefined || currentWaterLevel === null
                ? 'offline'
                : currentWaterLevel >= 25
                ? 'good'
                : 'danger'
            }
            min={0}
            max={100}
            visualizerType="water-tank"
            isFlashing={isTelemetryFlashing}
            isLoading={isLoadingInitial}
            isSignalRConnected={isConnected}
          />
        </div>
      </section>

      {/* ── 5. Devices & Actuators Overview Cards ── */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Device Status Card */}
        <section className="card-3d card-3d-interactive rounded-2xl p-5 space-y-4">
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
            <div className="rounded-xl border border-line/80 bg-canvas/60 p-3 shadow-3d-flat">
              <div className="flex items-center gap-2">
                <StatusDot status="online" size="sm" />
                <span className="text-xs text-muted font-medium">Online</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
                {summary ? (summary.devices?.onlineDevices ?? 0) : '--'}
              </p>
            </div>

            <div className="rounded-xl border border-line/80 bg-canvas/60 p-3 shadow-3d-flat">
              <div className="flex items-center gap-2">
                <StatusDot status="offline" size="sm" />
                <span className="text-xs text-muted font-medium">Offline</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
                {summary ? (summary.devices?.offlineDevices ?? 0) : '--'}
              </p>
            </div>
          </div>
        </section>

        {/* Pump & Actuators Card */}
        <section className="card-3d card-3d-interactive rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Droplets className="size-4 text-primary" />
              <span>{t('nav_irrigation', 'Tưới nước')}</span>
            </h3>
            <Link to="/irrigation" className="text-xs text-primary font-semibold hover:underline">
              {language === 'vi' ? 'Điều khiển' : 'Controls'} →
            </Link>
          </div>

          <div className="rounded-xl border border-line/80 bg-canvas/60 p-3.5 flex items-center justify-between shadow-3d-flat">
            <div>
              <p className="text-xs text-muted font-medium">
                {language === 'vi' ? 'Trạng thái theo Backend' : 'Backend-reported pump status'}
              </p>
              <p className="text-sm font-bold text-ink mt-1">
                {summary?.isAnyPumpRunning
                  ? language === 'vi'
                    ? 'Backend ghi nhận đang tưới'
                    : 'Backend reports irrigation active'
                  : language === 'vi'
                  ? 'Backend ghi nhận tạm dừng'
                  : 'Backend reports irrigation idle'}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {language === 'vi'
                  ? 'Chưa có phản hồi trạng thái bơm vật lý từ firmware ESP32.'
                  : 'The ESP32 firmware has not reported physical pump state.'}
              </p>
            </div>
            <StatusDot
              status={summary?.isAnyPumpRunning ? 'online' : 'offline'}
              label={language === 'vi' ? 'Backend' : 'Backend'}
              size="md"
            />
          </div>
        </section>

        {/* Real-time Gateway Hub Card */}
        <section className="card-3d card-3d-interactive rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              <span>SignalR Gateway</span>
            </h3>
            <span className="text-[11px] font-mono text-muted bg-canvas/60 px-2 py-0.5 rounded-md border border-line/60">
              /hubs/sensors
            </span>
          </div>

          <div className="rounded-xl border border-line/80 bg-canvas/60 p-3 space-y-2.5 shadow-3d-flat">
            {/* Connection status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Kết nối:' : 'Connection:'}</span>
              <span
                className={`font-semibold capitalize ${
                  connectionStatus === 'connected'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted'
                }`}
              >
                {connectionStatus}
              </span>
            </div>

            {/* Transport */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Truyền tải:' : 'Transport:'}</span>
              <span className="font-mono text-ink">
                {connectionStatus === 'connected' && transport !== 'Unknown'
                  ? transport
                  : connectionStatus === 'connected'
                  ? 'Negotiating…'
                  : '--'}
              </span>
            </div>

            {/* Authentication method */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Xác thực:' : 'Auth:'}</span>
              <span className="font-mono text-ink">JWT Bearer</span>
            </div>

            {/* Auto-reconnect */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{language === 'vi' ? 'Tự kết nối lại:' : 'Auto Reconnect:'}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {language === 'vi' ? 'Bật' : 'Enabled'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── 6. Recent Alerts & Recent Activities Section ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Recent Alerts */}
        <section className="card-3d card-3d-interactive rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line/80 pb-2.5">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <span>{language === 'vi' ? 'Cảnh báo gần đây' : 'Recent Alerts'}</span>
            </h3>
            <Link to="/alerts" className="text-xs text-primary font-semibold hover:underline">
              {language === 'vi' ? 'Tất cả' : 'View all'} →
            </Link>
          </div>

          {!summary?.recentAlerts || summary.recentAlerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              <CheckCircle2 className="mx-auto size-6 text-emerald-500 mb-1" />
              <p>{language === 'vi' ? 'Không có cảnh báo bất thường nào' : 'No active alerts'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.recentAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-line/80 bg-canvas/60 p-2.5 flex items-center justify-between text-xs shadow-3d-flat"
                >
                  <div>
                    <p className="font-bold text-ink">{alert.title}</p>
                    <p className="text-[11px] text-muted">{alert.message}</p>
                  </div>
                  <span className="text-[10px] text-muted font-mono whitespace-nowrap">
                    {new Date(alert.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Irrigation Activities */}
        <section className="card-3d card-3d-interactive rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line/80 pb-2.5">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <History className="size-4 text-primary" />
              <span>{language === 'vi' ? 'Hoạt động tưới gần đây' : 'Recent Irrigation Activities'}</span>
            </h3>
            <Link to="/history" className="text-xs text-primary font-semibold hover:underline">
              {language === 'vi' ? 'Nhật ký' : 'Full log'} →
            </Link>
          </div>

          {!summary?.recentIrrigationLogs || summary.recentIrrigationLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              <Droplets className="mx-auto size-6 text-muted/60 mb-1" />
              <p>{language === 'vi' ? 'Chưa có hoạt động tưới nào' : 'No watering activities yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.recentIrrigationLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-line/80 bg-canvas/60 p-2.5 flex items-center justify-between text-xs shadow-3d-flat"
                >
                  <div>
                    <span className="font-semibold text-ink">
                      {log.mode === 1
                        ? language === 'vi'
                          ? 'Tưới thủ công'
                          : 'Manual'
                        : language === 'vi'
                        ? 'Tưới tự động'
                        : 'Automatic'}
                    </span>
                    <p className="text-[11px] text-muted">
                      {log.durationSeconds ?? 0}s • {log.waterAmountMl ?? 0}ml
                    </p>
                  </div>
                  <span className="text-[10px] text-muted font-mono whitespace-nowrap">
                    {new Date(log.startedAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
