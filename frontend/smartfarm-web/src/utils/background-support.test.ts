// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isWebGLSupported,
  isReducedMotionPreferred,
  isWeakDevice,
  evaluateBackgroundSupport,
} from './background-support';

describe('background-support fallback evaluation', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Provide WebGLRenderingContext in jsdom
    (window as unknown as { WebGLRenderingContext: unknown }).WebGLRenderingContext = function () {};

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      contextId: string
    ) {
      if (contextId === 'webgl' || contextId === 'experimental-webgl') {
        return {} as WebGLRenderingContext;
      }
      return null;
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    window.matchMedia = originalMatchMedia;
  });

  it('detects reduced motion preference', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isReducedMotionPreferred()).toBe(true);
    const result = evaluateBackgroundSupport();
    expect(result.supported).toBe(false);
    expect(result.reason).toBe('reduced_motion');
  });

  it('marks mobile screens (< 768px) as weak devices', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    expect(isWeakDevice()).toBe(true);
    const result = evaluateBackgroundSupport();
    expect(result.supported).toBe(false);
    expect(result.reason).toBe('small_screen');
  });

  it('approves desktop devices with WebGL and no reduced motion', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      configurable: true,
      value: 8,
    });

    expect(isWebGLSupported()).toBe(true);
    const result = evaluateBackgroundSupport();
    expect(result.supported).toBe(true);
  });
});
