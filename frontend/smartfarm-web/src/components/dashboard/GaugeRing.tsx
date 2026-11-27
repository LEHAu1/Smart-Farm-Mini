import React, { useMemo } from 'react';

export interface GaugeRingProps {
  value: number; // 0 to 100 or actual value
  min?: number;
  max?: number;
  size?: number; // width & height in px
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export const GaugeRing = React.memo(function GaugeRing({
  value,
  min = 0,
  max = 100,
  size = 64,
  strokeWidth = 6,
  color = '#10b981',
  className = '',
  children,
}: GaugeRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Normalized percentage [0, 100]
  const percentage = useMemo(() => {
    if (isNaN(value)) return 0;
    const clamped = Math.min(Math.max(value, min), max);
    return ((clamped - min) / (max - min)) * 100;
  }, [value, min, max]);

  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const gradientId = useMemo(() => `gauge-grad-${Math.random().toString(36).substring(2, 9)}`, []);

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-line/40 dark:text-line/60"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>

      {/* Center content or value */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-[11px] font-bold text-ink tabular-nums">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
});
