import React from 'react'

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'running' | 'warning' | 'error' | 'idle'
  label?: string
  size?: 'sm' | 'md'
  showPulse?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showPulse = false,
}) => {
  const statusConfig = {
    online: {
      color: 'bg-[#16a34a]',
      pulseColor: 'bg-[#16a34a]/40',
      defaultLabel: 'Online',
    },
    offline: {
      color: 'bg-[#94a3b8]',
      pulseColor: 'bg-[#94a3b8]/40',
      defaultLabel: 'Offline',
    },
    running: {
      color: 'bg-[#0284c7]',
      pulseColor: 'bg-[#0284c7]/40',
      defaultLabel: 'Đang chạy',
    },
    warning: {
      color: 'bg-[#d97706]',
      pulseColor: 'bg-[#d97706]/40',
      defaultLabel: 'Cảnh báo',
    },
    error: {
      color: 'bg-[#dc2626]',
      pulseColor: 'bg-[#dc2626]/40',
      defaultLabel: 'Sự cố',
    },
    idle: {
      color: 'bg-[#647067]',
      pulseColor: 'bg-[#647067]/40',
      defaultLabel: 'Sẵn sàng',
    },
  }[status]

  const dotSize = size === 'sm' ? 'size-2' : 'size-2.5'
  const textClass = size === 'sm' ? 'text-xs text-[#647067]' : 'text-sm font-medium text-[#17251d]'

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex items-center justify-center">
        {showPulse && (status === 'online' || status === 'running') && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 ${statusConfig.pulseColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${statusConfig.color}`} />
      </span>
      {(label || label === undefined) && (
        <span className={textClass}>{label ?? statusConfig.defaultLabel}</span>
      )}
    </div>
  )
}

