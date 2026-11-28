import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TiltCard3D } from '../common/TiltCard3D';
import { RefreshCw, Server, Radio, Cpu, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export type InfraStatus = 'healthy' | 'connected' | 'connecting' | 'warning' | 'disconnected' | 'disabled' | 'unknown';

export interface InfraCard3DProps {
  serviceName: string;
  serviceType: 'webapi' | 'mqtt' | 'signalr';
  status: InfraStatus;
  statusLabel?: string;
  description?: string;
  onRecheck?: () => Promise<void> | void;
  isChecking?: boolean;
}

export const InfraCard3D = React.memo(function InfraCard3D({
  serviceName,
  serviceType,
  status,
  statusLabel,
  description,
  onRecheck,
  isChecking = false,
}: InfraCard3DProps) {
  const { t } = useLanguage();

  // Status-driven LED glow and styles
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return {
          ledClass: 'bg-emerald-500 shadow-[0_0_12px_2px_rgba(16,185,129,0.7)] animate-pulse',
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
          defaultLabel: t('infra_status_connected', 'Đã kết nối'),
        };
      case 'connecting':
        return {
          ledClass: 'bg-amber-400 shadow-[0_0_12px_2px_rgba(245,158,11,0.6)] animate-ping',
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: RefreshCw,
          defaultLabel: t('infra_status_connecting', 'Đang kết nối…'),
        };
      case 'warning':
        return {
          ledClass: 'bg-amber-500 shadow-[0_0_12px_2px_rgba(245,158,11,0.7)]',
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: AlertTriangle,
          defaultLabel: t('infra_status_connecting', 'Đang kết nối…'),
        };
      case 'disconnected':
        return {
          ledClass: 'bg-rose-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          icon: XCircle,
          defaultLabel: t('infra_status_disconnected', 'Mất kết nối'),
        };
      case 'disabled':
        return {
          ledClass: 'bg-slate-400 shadow-[0_0_8px_1px_rgba(148,163,184,0.4)]',
          badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          icon: AlertTriangle,
          defaultLabel: t('infra_status_disabled', 'Đã tắt'),
        };
      default:
        return {
          ledClass: 'bg-slate-400 shadow-[0_0_8px_1px_rgba(148,163,184,0.4)]',
          badgeBg: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
          icon: HelpCircle,
          defaultLabel: t('infra_status_unknown', 'Chưa kiểm tra'),
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const getServiceIcon = () => {
    switch (serviceType) {
      case 'webapi':
        return Server;
      case 'mqtt':
        return Cpu;
      case 'signalr':
        return Radio;
    }
  };
  const ServiceIcon = getServiceIcon();

  return (
    <TiltCard3D
      maxTilt={6}
      scale={1.01}
      className="card-3d card-3d-interactive rounded-2xl p-4 flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Service Icon, Name and Status LED */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
              <ServiceIcon className="size-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-ink text-shadow-contrast">{serviceName}</h3>
              <p className="text-[11px] text-muted line-clamp-1 text-backdrop-local font-medium inline-block mt-0.5">{description}</p>
            </div>
          </div>

          {/* LED Status Orb */}
          <div className="flex items-center gap-1.5 pt-1 shrink-0" title={statusLabel || config.defaultLabel}>
            <span className={`size-2.5 rounded-full ${config.ledClass}`} aria-hidden="true" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3.5 flex items-center justify-between gap-2 pt-2 border-t border-line/60">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${config.badgeBg}`}
          >
            <StatusIcon className="size-3.5" />
            <span>{statusLabel || config.defaultLabel}</span>
          </span>

          {/* Re-check Health Button */}
          {onRecheck && (
            <button
              type="button"
              disabled={isChecking}
              onClick={onRecheck}
              className="glass-button-secondary inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink transition-all px-2.5 py-1 rounded-lg focus-ring disabled:opacity-50"
              title={t('infra_recheck', 'Kiểm tra lại')}
              aria-label={`${t('infra_recheck', 'Kiểm tra lại')} ${serviceName}`}
            >
              <RefreshCw className={`size-3 ${isChecking ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">
                {isChecking ? t('infra_checking', 'Đang kiểm tra…') : t('infra_recheck', 'Kiểm tra lại')}
              </span>
            </button>
          )}
        </div>
      </div>
    </TiltCard3D>
  );
});
