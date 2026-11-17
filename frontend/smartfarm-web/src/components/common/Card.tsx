import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  isInteractive?: boolean;
}

export function Card({
  header,
  footer,
  children,
  isInteractive = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 shadow-xs transition-all ${
        isInteractive
          ? 'cursor-pointer hover:border-primary-border hover:shadow-sm hover:-translate-y-0.5'
          : ''
      } ${className}`}
      {...props}
    >
      {header && <div className="mb-4 border-b border-line/60 pb-3">{header}</div>}
      <div className="space-y-3">{children}</div>
      {footer && <div className="mt-4 border-t border-line/60 pt-3">{footer}</div>}
    </div>
  );
}
