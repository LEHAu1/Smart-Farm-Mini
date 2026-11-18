import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSensorHub } from '../../hooks/useSensorHub';
import { apiClient } from '../../services/api-client';
import type { DeviceCommandDto } from '../../types/command';
import type { PageResult } from '../../types/common';
import { Badge } from '../../components/common/Badge';
import {
  Terminal,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function CommandsPage() {
  const { t, language } = useLanguage();
  const { isConnected, onCommandStatus } = useSensorHub();

  const [commands, setCommands] = useState<DeviceCommandDto[]>([]);
  const [updatedCmdId, setUpdatedCmdId] = useState<string | null>(null);

  // 1. Load commands list via REST
  useEffect(() => {
    let isMounted = true;
    async function fetchCommands() {
      try {
        const { data } = await apiClient.get<PageResult<DeviceCommandDto>>('/api/commands', {
          params: { pageNumber: 1, pageSize: 50 },
        });
        if (isMounted && data?.items) {
          setCommands(data.items);
        }
      } catch {
        // Fallback for offline demo
      }
    }
    fetchCommands();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time CommandStatusUpdated event listener
  useEffect(() => {
    const unsub = onCommandStatus((liveCmd) => {
      setCommands((prev) => {
        const index = prev.findIndex((c) => c.id === liveCmd.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...liveCmd };
          return next;
        } else {
          return [liveCmd, ...prev];
        }
      });

      setUpdatedCmdId(liveCmd.id);
      setTimeout(() => setUpdatedCmdId(null), 2500);
    });

    return () => {
      unsub();
    };
  }, [onCommandStatus]);

  const getStatusBadge = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="success" showDot>
            Completed
          </Badge>
        );
      case 'acknowledged':
        return (
          <Badge variant="primary" showDot>
            Acknowledged
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" showDot>
            Failed
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="warning" showDot>
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{t('nav_commands', 'Lệnh điều khiển')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
            {language === 'vi' ? 'Nhật ký lệnh điều khiển thiết bị' : 'Device Command Dispatch Log'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            {t('placeholder_commands_desc', 'Gửi lệnh trực tiếp đến vi điều khiển ESP32 và theo dõi ACK.')}
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

      {/* Commands List Card */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            <span>{language === 'vi' ? 'Lệnh đã phát đến vi điều khiển' : 'Dispatched Commands'}</span>
          </h2>
          <span className="text-xs text-muted">
            Event: <code className="font-mono text-primary text-[11px]">CommandStatusUpdated</code>
          </span>
        </div>

        {commands.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            {language === 'vi' ? 'Chưa có lệnh điều khiển nào được phát gần đây.' : 'No recent commands found.'}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {commands.map((cmd) => {
              const isUpdated = updatedCmdId === cmd.id;
              return (
                <div
                  key={cmd.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-300 ${
                    isUpdated
                      ? 'bg-primary-subtle/40 dark:bg-primary-subtle/10'
                      : 'hover:bg-canvas/50'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas border border-line text-ink mt-0.5 sm:mt-0 font-mono text-xs font-bold">
                      ACK
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{cmd.action}</span>
                        <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-mono text-muted border border-line">
                          {cmd.commandCode}
                        </span>
                      </div>
                      {cmd.payload && (
                        <p className="text-xs font-mono text-muted mt-0.5 max-w-xl truncate">
                          Payload: {cmd.payload}
                        </p>
                      )}
                      {cmd.errorMessage && (
                        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                          Error: {cmd.errorMessage}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(cmd.createdAtUtc).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}
                        </span>
                        {cmd.completedAtUtc && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            Completed in{' '}
                            {Math.max(
                              0,
                              Math.round(
                                (new Date(cmd.completedAtUtc).getTime() - new Date(cmd.createdAtUtc).getTime()) /
                                  1000
                              )
                            )}
                            s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {getStatusBadge(cmd.statusName)}
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
