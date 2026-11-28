import React, { useMemo } from 'react';

export interface MiniSparklineProps {
  data?: number[];
  color?: string; // hex or CSS color
  height?: number;
  width?: number;
  className?: string;
  isMockFallback?: boolean;
}

export const MiniSparkline = React.memo(function MiniSparkline({
  data,
  color = '#10b981',
  height = 36,
  width = 120,
  className = '',
  isMockFallback = false,
}: MiniSparklineProps) {
  // Khi chưa có chuỗi đo telemetry thực tế, hiển thị đường xu hướng minh họa
  const points = useMemo(() => {
    if (data && data.length >= 2) return data;
    // Dữ liệu sóng minh họa mẫu (fallback trend)
    return [40, 42, 45, 43, 48, 52, 50, 54, 58, 55, 60, 62];
  }, [data]);

  const { pathD, fillD } = useMemo(() => {
    if (points.length < 2) return { pathD: '', fillD: '' };

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min === 0 ? 1 : max - min;
    const padding = 4;
    const effectiveHeight = height - padding * 2;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * effectiveHeight;
      return { x, y };
    });

    // Generate smooth bezier curve
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }

    const fill = `${d} L ${width} ${height} L 0 ${height} Z`;
    return { pathD: d, fillD: fill };
  }, [points, height, width]);

  const gradientId = useMemo(() => `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`, []);

  return (
    <div
      className={`relative flex items-center ${className}`}
      title={isMockFallback ? 'Xu hướng minh họa 24h (chờ chuỗi đo lịch sử)' : 'Xu hướng thời gian thực'}
    >
      <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient area under line */}
        <path d={fillD} fill={`url(#${gradientId})`} />

        {/* Smooth trend curve */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />

        {/* Tip pulse circle */}
        {points.length > 0 && (
          <circle
            cx={width}
            cy={
              height -
              4 -
              ((points[points.length - 1] - Math.min(...points)) /
                (Math.max(...points) - Math.min(...points) || 1)) *
                (height - 8)
            }
            r="3"
            fill={color}
            className="animate-ping origin-center"
            style={{ animationDuration: '3s' }}
          />
        )}
      </svg>
    </div>
  );
});
