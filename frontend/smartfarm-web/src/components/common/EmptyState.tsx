import React from 'react'
import { Inbox } from 'lucide-react'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8faf7] p-8 md:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="size-12 rounded-full bg-[#f1f5f1] text-[#647067] flex items-center justify-center mb-4">
        {icon ?? <Inbox className="size-6 text-[#8a968d]" />}
      </div>

      <h4 className="text-base font-semibold text-[#17251d] mb-1">{title}</h4>

      {description && (
        <p className="text-sm text-[#647067] mb-6 max-w-sm">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

