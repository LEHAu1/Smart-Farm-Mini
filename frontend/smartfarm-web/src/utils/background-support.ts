/**
 * Evaluates whether the system has sufficient capability and user preference
 * to render the full-page 3D Three.js background without causing frame drops.
 */

export interface BackgroundSupportResult {
  supported: boolean;
  reason?: 'no_webgl' | 'reduced_motion' | 'low_concurrency' | 'small_screen';
}

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function isWeakDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // Screen width under 768px (mobile/tablet devices save GPU battery)
  if (window.innerWidth < 768) {
    return true;
  }
  // Cores <= 4 is typical of low-power mobile/budget chipsets
  if (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number') {
    if (navigator.hardwareConcurrency <= 4) {
      return true;
    }
  }
  return false;
}

export function evaluateBackgroundSupport(): BackgroundSupportResult {
  if (!isWebGLSupported()) {
    return { supported: false, reason: 'no_webgl' };
  }
  if (isReducedMotionPreferred()) {
    return { supported: false, reason: 'reduced_motion' };
  }
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return { supported: false, reason: 'small_screen' };
  }
  if (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4) {
    return { supported: false, reason: 'low_concurrency' };
  }
  return { supported: true };
}
