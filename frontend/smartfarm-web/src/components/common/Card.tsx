import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white border border-[#e5eae5]',
      subtle: 'bg-[#f8faf7] border border-[#e5eae5]',
      interactive:
        'bg-white border border-[#e5eae5] hover:border-[#bbf7d0] transition-colors duration-150 cursor-pointer',
    }[variant]

    return (
      <div
        ref={ref}
        className={`rounded-xl p-5 md:p-6 ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`flex items-center justify-between pb-4 border-b border-[#f0f3f0] mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-[#17251d] ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ children, className = '', ...props }) => (
  <p className={`text-xs text-[#647067] mt-0.5 ${className}`} {...props}>
    {children}
  </p>
)

