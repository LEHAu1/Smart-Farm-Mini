import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size]

  const variantStyles = {
    success: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
    warning: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
    danger: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
    info: 'bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]',
    neutral: 'bg-[#f1f5f1] text-[#647067] border-[#e5eae5]',
  }[variant]

  const dotStyles = {
    success: 'bg-[#16a34a]',
    warning: 'bg-[#d97706]',
    danger: 'bg-[#dc2626]',
    info: 'bg-[#0284c7]',
    neutral: 'bg-[#8a968d]',
  }[variant]

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`size-1.5 rounded-full ${dotStyles}`} />}
      {children}
    </span>
  )
}

