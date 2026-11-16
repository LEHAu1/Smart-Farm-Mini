import type { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'water' | 'warning' | 'danger' | 'success';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  showDot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  showDot = false,
  className = '',
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: 'bg-canvas text-muted border border-line',
      dot: 'bg-muted',
    },
    primary: {
      container: 'bg-primary-subtle text-primary border border-primary-border/40',
      dot: 'bg-primary',
    },
    water: {
      container: 'bg-water-subtle text-water border border-water-border/40',
      dot: 'bg-water',
    },
    warning: {
      container: 'bg-warning-subtle text-warning border border-warning-border/40',
      dot: 'bg-warning',
    },
    danger: {
      container: 'bg-danger-subtle text-danger border border-danger-border/40',
      dot: 'bg-danger',
    },
    success: {
      container: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      dot: 'bg-emerald-600',
    },
  };

  const current = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${current.container} ${className}`}
    >
      {showDot && <span className={`size-1.5 rounded-full ${current.dot}`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
