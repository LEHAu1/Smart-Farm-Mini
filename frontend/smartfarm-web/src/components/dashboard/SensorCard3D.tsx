import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TiltCard3D } from '../common/TiltCard3D';
import { MiniSparkline } from './MiniSparkline';
import { GaugeRing } from './GaugeRing';
import { WaterWaveVisualizer } from './WaterWaveVisualizer';
import { WifiOff } from 'lucide-react';

export type SensorHealthStatus = 'good' | 'warning' | 'danger' | 'offline';

export interface SensorCard3DProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  sensorDetail?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string; // hex color code
  status?: SensorHealthStatus;
  statusText?: string;
  min?: number;
  max?: number;
  visualizerType?: 'gauge' | 'water-tank' | 'none';
  historyData?: number[];
  isFlashing?: boolean;
  isLoading?: boolean;
  isSignalRConnected?: boolean;
}

export const SensorCard3D = React.memo(function SensorCard3D({
  title,
  value,
  unit,
  sensorDetail,
  icon: Icon,
  accentColor = '#10b981',
  status = 'good',
  statusText,
  min = 0,
  max = 100,
  visualizerType = 'gauge',
  historyData,
  isFlashing = false,
  isLoading = false,
  isSignalRConnected = true,
}: SensorCard3DProps) {
  const { t } = useLanguage();

  // Smooth Count-Up Animation using requestAnimationFrame
  const [displayValue, setDisplayValue] = useState<number | null>(value ?? null);
  const previousValueRef = useRef<number | null>(value ?? null);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayValue(null);
      previousValueRef.current = null;
      return;
    }

    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced || previousValueRef.current === null) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startVal = previousValueRef.current;
    const endVal = value;
    const startTime = performance.now();
    const duration = 400; // 400ms smooth count-up

    let animId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        previousValueRef.current = endVal;
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  // Status configuration
  const statusConfig = useMemo(() => {
    if (!isSignalRConnected) {
      return {
        label: t('metric_status_danger', 'Mất kết nối'),
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotColor: '#ef4444',
      };
    }

    switch (status) {
      case 'good':
        return {
          label: statusText || t('metric_status_good', 'Tốt'),
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dotColor: '#10b981',
        };
      case 'warning':
        return {
          label: statusText || t('metric_status_warning', 'Chú ý'),
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dotColor: '#f59e0b',
        };
      case 'danger':
        return {
          label: statusText || t('metric_status_danger', 'Nguy hiểm'),
          badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dotColor: '#ef4444',
        };
      default:
        return {
          label: statusText || '--',
          badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          dotColor: '#94a3b8',
        };
    }
  }, [status, statusText, isSignalRConnected, t]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="card-3d rounded-2xl p-4.5 animate-pulse flex flex-col justify-between min-h-[180px]">
        <div className="flex items-center justify-between">
          <div className="size-8 rounded-xl bg-line/60" />
          <div className="h-4 w-16 rounded bg-line/60" />
        </div>
        <div className="my-4 space-y-2">
          <div className="h-8 w-24 rounded bg-line/60" />
          <div className="h-3 w-32 rounded bg-line/40" />
        </div>
        <div className="h-8 w-full rounded bg-line/30" />
      </div>
    );
  }

  const numValue = displayValue !== null ? Number(displayValue) : null;

  return (
    <TiltCard3D
      maxTilt={6}
      scale={1.015}
      className={`card-3d card-3d-interactive rounded-2xl p-4.5 flex flex-col justify-between min-h-[190px] transition-colors duration-300 ${
        isFlashing ? 'border-primary ring-2 ring-primary/30 shadow-lg' : ''
      } ${!isSignalRConnected ? 'opacity-85' : ''}`}
    >
      <div>
        {/* Top Header: 3D Icon, Title, Status & Offline Indicator */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-white shadow-3d-raised shrink-0 transition-transform duration-200 group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor} 100%)`,
                boxShadow: `0 4px 14px -2px ${accentColor}44`,
              }}
            >
              <Icon className="size-4.5" />
            </span>
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</h3>
              <p className="text-[11px] text-muted/80">{sensorDetail}</p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusConfig.badgeClass} shrink-0`}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: statusConfig.dotColor,
                boxShadow: `0 0 6px ${statusConfig.dotColor}`,
              }}
            />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Value & Circular Visualizer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink tabular-nums tracking-tight">
                {numValue !== null ? numValue.toFixed(1) : '--'}
              </span>
              <span className="text-sm font-semibold text-muted">{unit}</span>
            </div>

            {/* Offline Alert Indicator */}
            {!isSignalRConnected && (
              <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-rose-500">
                <WifiOff className="size-3" />
                <span>{t('signalr_disconnected', 'Mất kết nối')}</span>
              </span>
            )}
          </div>

          {/* 3D Visualizer Component */}
          {numValue !== null && visualizerType === 'gauge' && (
            <GaugeRing
              value={numValue}
              min={min}
              max={max}
              size={56}
              strokeWidth={5}
              color={accentColor}
            />
          )}

          {numValue !== null && visualizerType === 'water-tank' && (
            <WaterWaveVisualizer
              percentage={numValue}
              size={52}
              color={accentColor}
            />
          )}
        </div>
      </div>

      {/* Bottom: Mini Sparkline Trend */}
      <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted/70 tracking-wider uppercase">
          {t('metric_trend_24h', 'Xu hướng 24h')}
        </span>
        <MiniSparkline
          data={historyData}
          color={accentColor}
          height={26}
          width={100}
          isMockFallback={!historyData || historyData.length === 0}
        />
      </div>
    </TiltCard3D>
  );
});
