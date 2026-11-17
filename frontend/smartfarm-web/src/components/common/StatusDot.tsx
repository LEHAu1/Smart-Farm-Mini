export type StatusType = 'online' | 'offline' | 'watering' | 'warning';

export interface StatusDotProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusDot({
  status,
  label,
  size = 'md',
  className = '',
}: StatusDotProps) {
  const sizeMap = {
    sm: 'size-2',
    md: 'size-2.5',
    lg: 'size-3',
  };

  const statusMap: Record<StatusType, { color: string; ping: boolean; title: string }> = {
    online: {
      color: 'bg-primary',
      ping: true,
      title: 'Đang kết nối (Online)',
    },
    offline: {
      color: 'bg-danger',
      ping: false,
      title: 'Mất kết nối (Offline)',
    },
    watering: {
      color: 'bg-water',
      ping: true,
      title: 'Đang tưới nước (Watering)',
    },
    warning: {
      color: 'bg-warning',
      ping: true,
      title: 'Cảnh báo bất thường',
    },
  };

  const current = statusMap[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title={label || current.title}>
      <span className="relative flex shrink-0">
        {current.ping && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${current.color}`}
            aria-hidden="true"
          />
        )}
        <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${current.color}`} />
      </span>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
    </div>
  );
}
