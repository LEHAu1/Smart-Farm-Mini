import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      id: customId,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`min-h-10 w-full rounded-lg border bg-surface px-3.5 py-2 text-sm text-ink transition-colors focus-ring disabled:bg-canvas disabled:text-muted ${
            error
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line hover:border-muted/50 focus-visible:outline-water'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-danger font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
