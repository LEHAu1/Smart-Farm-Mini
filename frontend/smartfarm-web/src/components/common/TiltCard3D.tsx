import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt rotation degrees (default: 8)
  glare?: boolean;
  scale?: number; // slight scale on hover (default: 1.02)
}

export const TiltCard3D = React.memo(function TiltCard3D({
  children,
  className = '',
  maxTilt = 7,
  glare = true,
  scale = 1.015,
  style,
  ...rest
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('');
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    // Disable on touch devices or reduced-motion
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || isReduced) {
      setIsSupported(false);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSupported || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      const rotateX = ((y - height / 2) / (height / 2)) * -maxTilt;
      const rotateY = ((x - width / 2) / (width / 2)) * maxTilt;

      setTransform(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        const glareX = (x / width) * 100;
        const glareY = (y / height) * 100;
        setGlareStyle({
          opacity: 0.22,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 65%)`,
        });
      }
    },
    [isSupported, maxTilt, scale, glare]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isSupported) return;
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle({ opacity: 0, transition: 'opacity 350ms ease' });
  }, [isSupported]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: isSupported ? transform : undefined,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      {...rest}
    >
      {children}
      {glare && isSupported && (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-200"
          style={glareStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
});
