import React from 'react';

export interface HeroPlantFallbackProps {
  className?: string;
  isIrrigating?: boolean;
}

export const HeroPlantFallback = React.memo(function HeroPlantFallback({
  className = '',
  isIrrigating = false,
}: HeroPlantFallbackProps) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      aria-label="Minh họa chậu cây vườn thông minh 3D"
      role="img"
    >
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[220px] max-h-[220px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
      >
        <defs>
          {/* Pedestal Gradient */}
          <linearGradient id="pedestalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#065f46" stopOpacity="0.8" />
          </linearGradient>

          {/* Plant Leaves Gradient */}
          <linearGradient id="leafGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Ceramic Pot Gradient */}
          <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f3f4f6" />
            <stop offset="50%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="plantGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating Halo Pedestal */}
        <ellipse cx="120" cy="200" rx="70" ry="16" fill="url(#pedestalGrad)" />
        <ellipse
          cx="120"
          cy="198"
          rx="56"
          ry="12"
          fill="#10b981"
          fillOpacity="0.3"
          filter="url(#plantGlow)"
        />

        {/* Ceramic 3D Pot */}
        <path
          d="M80 148 L92 192 Q120 198 148 192 L160 148 Z"
          fill="url(#potGrad)"
          stroke="#d1d5db"
          strokeWidth="1.5"
        />
        <ellipse cx="120" cy="148" rx="40" ry="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
        <ellipse cx="120" cy="148" rx="36" ry="6" fill="#374151" />

        {/* Stem & Leaves */}
        <path
          d="M120 146 Q120 110 120 84"
          stroke="#059669"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Left Leaf */}
        <path
          d="M120 122 C90 118 72 90 76 74 C96 74 116 102 120 122 Z"
          fill="url(#leafGrad1)"
          className={isIrrigating ? 'animate-bounce' : ''}
          style={{ transformOrigin: '120px 122px' }}
        />

        {/* Right Leaf */}
        <path
          d="M120 106 C150 102 168 76 164 60 C144 60 124 86 120 106 Z"
          fill="url(#leafGrad2)"
          className={isIrrigating ? 'animate-bounce' : ''}
          style={{ transformOrigin: '120px 106px' }}
        />

        {/* Top Sprout Leaf */}
        <path
          d="M120 84 C110 60 112 40 120 32 C128 40 130 60 120 84 Z"
          fill="#34d399"
          filter={isIrrigating ? 'url(#plantGlow)' : undefined}
        />

        {/* Water drops if irrigating */}
        {isIrrigating && (
          <g className="animate-pulse">
            <circle cx="106" cy="62" r="3" fill="#38bdf8" />
            <circle cx="138" cy="80" r="2.5" fill="#38bdf8" />
            <circle cx="120" cy="48" r="3.5" fill="#38bdf8" />
          </g>
        )}
      </svg>
    </div>
  );
});
