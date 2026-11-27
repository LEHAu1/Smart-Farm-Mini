import React from 'react';

export interface WaterWaveVisualizerProps {
  percentage: number; // 0 to 100
  size?: number; // width & height
  color?: string;
  className?: string;
}

export const WaterWaveVisualizer = React.memo(function WaterWaveVisualizer({
  percentage = 50,
  size = 56,
  color = '#0ea5e9',
  className = '',
}: WaterWaveVisualizerProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-line/80 bg-canvas/60 shadow-inner flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={`Mực nước: ${Math.round(clamped)}%`}
      aria-label={`Mực nước bình chứa: ${Math.round(clamped)}%`}
    >
      {/* Background Water fill */}
      <div
        className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
        style={{
          height: `${clamped}%`,
          background: `linear-gradient(180deg, ${color}88 0%, ${color} 100%)`,
        }}
      >
        {/* Animated wave crest */}
        <div
          className="absolute -top-1.5 inset-x-0 h-3 opacity-75"
          style={{
            background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.8) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Surface reflection highlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20 pointer-events-none rounded-[inherit]" />

      {/* Center percentage label */}
      <span className="relative z-10 text-[11px] font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums">
        {Math.round(clamped)}%
      </span>
    </div>
  );
});
