import React from 'react'

export interface MetricCardProps {
  title: string
  value: string | number | null | undefined
  unit?: string
  icon?: React.ReactNode
  statusBadge?: React.ReactNode
  subtitle?: string
  isLoading?: boolean
  className?: string
  accentColor?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  statusBadge,
  subtitle,
  isLoading = false,
  className = '',
  accentColor,
}) => {
  return (
    <div
      className={`rounded-xl border border-[#e5eae5] bg-white p-5 transition-colors duration-150 relative overflow-hidden ${className}`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-[#647067] tracking-wider uppercase">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {statusBadge}
          {icon && (
            <div className="size-8 rounded-lg bg-[#f1f5f1] flex items-center justify-center text-[#15803d]">
              {icon}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-2">
          <div className="h-8 w-28 bg-[#e5eae5] animate-pulse rounded-md" />
          <div className="h-3.5 w-36 bg-[#f0f3f0] animate-pulse rounded-md mt-2" />
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-bold text-[#17251d] tabular-nums tracking-tight">
              {value ?? '--'}
            </span>
            {unit && (
              <span className="text-sm font-semibold text-[#647067]">
                {unit}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-[#8a968d] mt-1.5 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

