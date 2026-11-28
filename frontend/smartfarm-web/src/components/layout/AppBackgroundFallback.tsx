import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export interface AppBackgroundFallbackProps {
  className?: string;
}

export const AppBackgroundFallback = React.memo(function AppBackgroundFallback({
  className = '',
}: AppBackgroundFallbackProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* ── Base Atmospheric Gradient ── */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 10%, #11273f 0%, #081423 45%, #040913 100%)'
            : 'radial-gradient(ellipse at 50% 15%, #e0f2fe 0%, #ecfdf5 45%, #f0fdf4 100%)',
        }}
      />

      {/* ── Colorful Light Pillars & Glow Pools ── */}
      {/* 1. Emerald Greenhouse Bio-glow (Center-Left) */}
      <div
        className="absolute top-[10%] left-[15%] w-[550px] h-[550px] rounded-full blur-[110px] opacity-75 transition-all duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.12) 50%, transparent 75%)'
            : 'radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 75%)',
        }}
      />

      {/* 2. Teal / Cyan Sky Depth (Top-Right) */}
      <div
        className="absolute -top-[5%] right-[10%] w-[600px] h-[500px] rounded-full blur-[120px] opacity-65 transition-all duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, rgba(30, 58, 138, 0.18) 55%, transparent 75%)'
            : 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.08) 55%, transparent 75%)',
        }}
      />

      {/* 3. Warm Grow-Light Amber Shaft (Bottom-Center) */}
      <div
        className="absolute bottom-[-10%] left-[35%] w-[650px] h-[450px] rounded-full blur-[100px] opacity-60 transition-all duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(251, 191, 36, 0.24) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 70%)',
        }}
      />

      {/* 4. Violet Night Accent (Far Bottom-Right) */}
      <div
        className="absolute bottom-[5%] right-[-5%] w-[480px] h-[480px] rounded-full blur-[110px] opacity-55 transition-all duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(91, 33, 182, 0.1) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(192, 132, 252, 0.15) 0%, rgba(147, 51, 234, 0.05) 50%, transparent 70%)',
        }}
      />

      {/* ── Geometric Greenhouse Truss Silhouette (SVG) ── */}
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-25 dark:opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="beamGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? '#38bdf8' : '#0284c7'} stopOpacity="0.4" />
            <stop offset="60%" stopColor={isDark ? '#34d399' : '#059669'} stopOpacity="0.2" />
            <stop offset="100%" stopColor={isDark ? '#10b981' : '#047857'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Diagonal greenhouse roof arches */}
        <line x1="100" y1="0" x2="720" y2="280" stroke="url(#beamGradient)" strokeWidth="1.5" />
        <line x1="1340" y1="0" x2="720" y2="280" stroke="url(#beamGradient)" strokeWidth="1.5" />
        <line x1="720" y1="0" x2="720" y2="900" stroke="url(#beamGradient)" strokeWidth="1.5" strokeDasharray="6 4" />
        <line x1="0" y1="280" x2="1440" y2="280" stroke="url(#beamGradient)" strokeWidth="1" />
        <line x1="300" y1="0" x2="520" y2="280" stroke="url(#beamGradient)" strokeWidth="0.8" />
        <line x1="1140" y1="0" x2="920" y2="280" stroke="url(#beamGradient)" strokeWidth="0.8" />

        {/* Vertical glass columns */}
        <line x1="240" y1="280" x2="240" y2="900" stroke="url(#beamGradient)" strokeWidth="1.2" />
        <line x1="480" y1="280" x2="480" y2="900" stroke="url(#beamGradient)" strokeWidth="1.2" />
        <line x1="960" y1="280" x2="960" y2="900" stroke="url(#beamGradient)" strokeWidth="1.2" />
        <line x1="1200" y1="280" x2="1200" y2="900" stroke="url(#beamGradient)" strokeWidth="1.2" />

        {/* Foreground botanical silhouettes at bottom corners */}
        <path
          d="M-50 900 C30 820 120 830 180 900 Z"
          fill={isDark ? '#064e3b' : '#a7f3d0'}
          fillOpacity={isDark ? 0.35 : 0.4}
        />
        <path
          d="M1300 900 C1360 810 1450 830 1500 900 Z"
          fill={isDark ? '#065f46' : '#6ee7b7'}
          fillOpacity={isDark ? 0.35 : 0.4}
        />
      </svg>
    </div>
  );
});
