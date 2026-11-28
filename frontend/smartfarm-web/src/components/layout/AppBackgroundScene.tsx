import React, { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { evaluateBackgroundSupport } from '../../utils/background-support';
import { AppBackgroundFallback } from './AppBackgroundFallback';
import type { SylvaLivingWorldVariant } from '../threeui/sylva-living-world/SylvaLivingWorldScene';

const SylvaLivingWorldSceneLazy = React.lazy(() =>
  import('../threeui/sylva-living-world/SylvaLivingWorldScene').then((m) => ({
    default: m.SylvaLivingWorldScene,
  }))
);

export interface AppBackgroundSceneProps {
  className?: string;
  variant?: SylvaLivingWorldVariant;
}

const VALID_VARIANTS: SylvaLivingWorldVariant[] = [
  'living-green',
  'sakura-sunset',
  'maple-autumn',
  'sequoia-mist',
];

/**
 * AppBackgroundScene: Renders ThreeUI Sylva Living World 3D scene
 * as a full-page background with minimal overhead and high clarity.
 *
 * Visual improvements:
 * 1. Scrim layer reduced to 10% (dark) and 18% (light) with ZERO backdrop-blur.
 * 2. Supports dynamic variant switching via ?bg= query param (defaults to 'living-green').
 * 3. Individual CSS brightness/saturate/contrast filters applied directly to the 3D scene iframe.
 * 4. Strictly non-blocking: pointer-events: none preserves all foreground interactions.
 */
export const AppBackgroundScene = React.memo(function AppBackgroundScene({
  className = '',
  variant: propVariant,
}: AppBackgroundSceneProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();

  const [canRender3D, setCanRender3D] = useState<boolean>(false);
  const [variant, setVariant] = useState<SylvaLivingWorldVariant>(() => {
    if (propVariant && VALID_VARIANTS.includes(propVariant)) return propVariant;
    return 'living-green';
  });

  // Sync variant from propVariant or query parameter ?bg=
  useEffect(() => {
    if (propVariant && VALID_VARIANTS.includes(propVariant)) {
      setVariant(propVariant);
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    const bgParam = searchParams.get('bg') as SylvaLivingWorldVariant;
    if (bgParam && VALID_VARIANTS.includes(bgParam)) {
      setVariant(bgParam);
    } else {
      setVariant('living-green');
    }
  }, [propVariant, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Evaluate hardware capability & preferences
    const support = evaluateBackgroundSupport();
    if (!support.supported) {
      return;
    }

    // Schedule 3D bundle loading after first paint via requestIdleCallback
    const idleFn = window.requestIdleCallback || ((cb: () => void) => window.setTimeout(cb, 100));
    const cancelFn = window.cancelIdleCallback || ((id: number) => window.clearTimeout(id));

    const handle = idleFn(() => {
      setCanRender3D(true);
    });

    return () => {
      cancelFn(handle as number);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* ── Base Fallback Background (Visible immediately, then covered by 3D scene) ── */}
      <AppBackgroundFallback />

      {/* ── ThreeUI Sylva Living World 3D Scene ── */}
      {canRender3D && (
        <Suspense fallback={null}>
          <SylvaLivingWorldSceneLazy
            key={variant}
            variant={variant}
            className="w-full h-full pointer-events-none"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          />
        </Suspense>
      )}

      {/* ── Center Softening Mask for Reading Comfort (Dynamic via --sylva-softness) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,var(--sylva-softness)) 0%, transparent 75%)'
            : 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,var(--sylva-softness)) 0%, transparent 75%)',
        }}
      />

      {/* ── Ultra-light Scrim Layer (8-10% Dark, 15-18% Light, NO blur) ── */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${
          isDark
            ? 'bg-slate-950/10'
            : 'bg-white/18'
        }`}
      />
    </div>
  );
});
