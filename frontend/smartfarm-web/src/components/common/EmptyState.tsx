import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 p-8 text-center sm:p-12 ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary mb-4 shadow-xs">
        {icon || <Sprout className="size-6" />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
