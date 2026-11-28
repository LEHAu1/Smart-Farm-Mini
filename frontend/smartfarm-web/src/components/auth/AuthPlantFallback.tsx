import React from 'react';
import type { PlantMood } from './auth-plant-mood';

export interface AuthPlantFallbackProps {
  className?: string;
  mood?: PlantMood;
  progress?: number;
}

export const AuthPlantFallback: React.FC<AuthPlantFallbackProps> = ({
  className = '',
  mood = 'idle',
  progress = 0,
}) => {
  const getMoodColor = () => {
    switch (mood) {
      case 'error':
        return '#f87171';
      case 'success':
        return '#34d399';
      case 'focus':
        return '#38bdf8';
      default:
        return '#10b981';
    }
  };

  const scale = 0.85 + Math.min(progress, 1) * 0.25;

  return (
    <div
      className={`relative flex items-center justify-center p-6 select-none ${className}`}
      aria-label="Minh họa cây xanh vườn thông minh"
    >
      <svg
        viewBox="0 0 240 240"
        className="w-48 h-48 drop-shadow-2xl transition-all duration-500 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        <defs>
          <radialGradient id="fallbackGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={getMoodColor()} stopOpacity="0.4" />
            <stop offset="100%" stopColor={getMoodColor()} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fallbackPot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="fallbackPedestal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="120" cy="120" r="95" fill="url(#fallbackGlow)" className="animate-pulse" />

        {/* Pedestal */}
        <ellipse cx="120" cy="205" rx="72" ry="14" fill="url(#fallbackPedestal)" />
        <ellipse cx="120" cy="202" rx="68" ry="10" fill="none" stroke={getMoodColor()} strokeWidth="1.5" opacity="0.6" />

        {/* Pot */}
        <polygon points="84,145 156,145 146,195 94,195" fill="url(#fallbackPot)" stroke="#94a3b8" strokeWidth="1" />
        <ellipse cx="120" cy="145" rx="36" ry="6" fill="#475569" />
        <ellipse cx="120" cy="144" rx="32" ry="5" fill="#1e293b" />

        {/* Plant Stem */}
        <path
          d="M120 144 Q118 105 120 75"
          fill="none"
          stroke="#059669"
          strokeWidth="5"
          strokeLinecap="round"
          className="transition-transform duration-500"
        />

        {/* Leaves */}
        <path
          d="M118 115 C95 110 88 88 105 85 C118 85 118 110 118 115 Z"
          fill="#10b981"
          stroke="#047857"
          strokeWidth="1"
          className={mood === 'error' ? 'translate-y-2 rotate-12 transition-all duration-300' : 'transition-all duration-300'}
        />
        <path
          d="M120 100 C145 95 150 75 135 72 C120 72 120 95 120 100 Z"
          fill="#34d399"
          stroke="#059669"
          strokeWidth="1"
          className={mood === 'error' ? 'translate-y-2 -rotate-12 transition-all duration-300' : 'transition-all duration-300'}
        />
        <path
          d="M120 75 C110 55 130 50 120 40 C110 50 115 65 120 75 Z"
          fill="#6ee7b7"
          stroke="#10b981"
          strokeWidth="1"
        />

        {/* Blooming Flower on top if progress >= 0.75 or success */}
        {(progress >= 0.75 || mood === 'success') && (
          <g className="animate-bounce" style={{ transformOrigin: '120px 40px', animationDuration: '2s' }}>
            <circle cx="120" cy="38" r="6" fill="#fbbf24" />
            <circle cx="114" cy="38" r="4" fill="#f59e0b" opacity="0.8" />
            <circle cx="126" cy="38" r="4" fill="#f59e0b" opacity="0.8" />
            <circle cx="120" cy="32" r="4" fill="#f59e0b" opacity="0.8" />
            <circle cx="120" cy="44" r="4" fill="#f59e0b" opacity="0.8" />
          </g>
        )}
      </svg>
    </div>
  );
};
