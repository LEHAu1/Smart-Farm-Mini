import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2'

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
    }[size]

    const variantStyles = {
      primary:
        'bg-[#15803d] text-white hover:bg-[#166534] active:bg-[#14532d] shadow-xs',
      secondary:
        'bg-[#0f766e] text-white hover:bg-[#115e59] active:bg-[#134e4a] shadow-xs',
      outline:
        'border border-[#e5eae5] bg-white text-[#17251d] hover:bg-[#f8faf7] hover:border-[#cbd5e1] active:bg-[#f1f5f9]',
      ghost:
        'bg-transparent text-[#647067] hover:bg-[#f1f5f1] hover:text-[#17251d]',
      danger:
        'bg-[#dc2626] text-white hover:bg-[#b91c1c] active:bg-[#991b1b] shadow-xs',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

