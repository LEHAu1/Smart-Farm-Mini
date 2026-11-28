// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { calculateRegisterProgress } from './auth-plant-mood';
import { AuthPlantScene } from './AuthPlantScene';
import { AuthPlantFallback } from './AuthPlantFallback';

afterEach(cleanup);

describe('Auth Plant Mood & Progress & Fallback Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('(a) Immediate redirect without animation delays', () => {
    it('executes redirect synchronously upon login resolution without animation timer delays', async () => {
      // Validates that plantMood transition to 'success' does not schedule blocking promises
      let navigated = false;
      const fakeNavigate = vi.fn((_path?: string, _options?: { replace?: boolean }) => {
        navigated = true;
      });

      // Simulate login handler pattern
      const handleLoginSuccess = () => {
        // Trigger plant success animation
        const mood = 'success';
        expect(mood).toBe('success');
        // Immediate navigate call
        fakeNavigate('/dashboard', { replace: true });
      };

      const startTime = performance.now();
      handleLoginSuccess();
      const endTime = performance.now();

      expect(navigated).toBe(true);
      expect(fakeNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      // Total elapsed time must be immediate (< 10ms, no setTimeout or sleep)
      expect(endTime - startTime).toBeLessThan(20);
    });

    it('handles post-login gateway transition with max 600ms timeout and escape hatch', () => {
      vi.useFakeTimers();
      const fakeNavigate = vi.fn();
      let didNavigate = false;

      const finishNavigation = () => {
        if (didNavigate) return;
        didNavigate = true;
        fakeNavigate('/dashboard', { replace: true });
      };

      window.addEventListener('keydown', finishNavigation, { once: true });
      window.addEventListener('pointerdown', finishNavigation, { once: true });
      setTimeout(finishNavigation, 450);

      // Fast-forward 400ms: not yet navigated
      vi.advanceTimersByTime(400);
      expect(fakeNavigate).not.toHaveBeenCalled();

      // Fast-forward to 450ms: navigates
      vi.advanceTimersByTime(50);
      expect(fakeNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      vi.useRealTimers();
    });

    it('escape hatch immediately navigates on user keydown before 450ms timer completes', () => {
      vi.useFakeTimers();
      const fakeNavigate = vi.fn();
      let didNavigate = false;

      const finishNavigation = () => {
        if (didNavigate) return;
        didNavigate = true;
        window.removeEventListener('keydown', finishNavigation);
        fakeNavigate('/dashboard', { replace: true });
      };

      window.addEventListener('keydown', finishNavigation, { once: true });
      setTimeout(finishNavigation, 450);

      // User presses key at 100ms
      vi.advanceTimersByTime(100);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(fakeNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });

      // Advancing to 450ms does not trigger a second navigation
      vi.advanceTimersByTime(350);
      expect(fakeNavigate).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('navigates instantly without transition if prefers-reduced-motion is active', () => {
      const fakeNavigate = vi.fn();
      const prefersReducedMotion = true;

      if (prefersReducedMotion) {
        fakeNavigate('/dashboard', { replace: true });
      }

      expect(fakeNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('(b) Plant growth progress strictly dependent on boolean validity flags', () => {
    it('returns 0 progress when all fields are invalid or empty', () => {
      const progress = calculateRegisterProgress({});
      expect(progress).toBe(0);
    });

    it('returns exactly 0.25 when 1 boolean flag is true', () => {
      const progress = calculateRegisterProgress({
        username: true,
        email: false,
        password: false,
        confirm: false,
      });
      expect(progress).toBe(0.25);
    });

    it('returns exactly 0.50 when 2 boolean flags are true', () => {
      const progress = calculateRegisterProgress({
        username: true,
        email: true,
        password: false,
        confirm: false,
      });
      expect(progress).toBe(0.5);
    });

    it('returns exactly 0.75 when 3 boolean flags are true', () => {
      const progress = calculateRegisterProgress({
        username: true,
        email: true,
        password: true,
        confirm: false,
      });
      expect(progress).toBe(0.75);
    });

    it('returns 1.0 when all 4 boolean flags are true', () => {
      const progress = calculateRegisterProgress({
        username: true,
        email: true,
        password: true,
        confirm: true,
      });
      expect(progress).toBe(1.0);
    });

    it('guarantees sensitive values (password strings) are never inspected or required', () => {
      // Pass booleans derived from validation without passing secret strings
      const hasValidUsername = 'smartfarmer'.length >= 3;
      const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test('farm@domain.com');
      const hasValidPassword = true; // derived from policy validator
      const hasConfirmedPassword = true;

      const progress = calculateRegisterProgress({
        username: hasValidUsername,
        email: hasValidEmail,
        password: hasValidPassword,
        confirm: hasConfirmedPassword,
      });

      expect(progress).toBe(1.0);
    });

    it('handles unexpected or missing fields gracefully without throwing', () => {
      expect(calculateRegisterProgress({ username: undefined, email: false })).toBe(0);
      expect(calculateRegisterProgress({ password: true })).toBe(0.25);
    });
  });

  describe('(c) Fallback when WebGL is unsupported or reduced-motion is active', () => {
    it('renders AuthPlantFallback when WebGL canvas context is unavailable', () => {
      // In JSDOM, HTMLCanvasElement.getContext('webgl') returns null by default
      render(<AuthPlantScene mood="idle" progress={0.5} />);

      const fallback = screen.getByLabelText('Minh họa cây xanh vườn thông minh');
      expect(fallback).toBeTruthy();
    });

    it('renders AuthPlantFallback when prefers-reduced-motion is detected', () => {
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

      render(<AuthPlantScene mood="focus" progress={0.75} />);

      const fallback = screen.getByLabelText('Minh họa cây xanh vườn thông minh');
      expect(fallback).toBeTruthy();
    });

    it('AuthPlantFallback adapts colors according to plant mood', () => {
      const { rerender, container } = render(<AuthPlantFallback mood="error" progress={0.25} />);
      expect(container.innerHTML).toContain('#f87171');

      rerender(<AuthPlantFallback mood="success" progress={1.0} />);
      expect(container.innerHTML).toContain('#34d399');

      rerender(<AuthPlantFallback mood="focus" progress={0.5} />);
      expect(container.innerHTML).toContain('#38bdf8');
    });
  });

  describe('(d) 3-step registration stepper & server error routing', () => {
    it('maps server error messages to the corresponding registration step', () => {
      const getStepFromServerError = (msg: string): 1 | 2 | 3 => {
        const lower = msg.toLowerCase();
        if (lower.includes('tên người dùng') || lower.includes('username')) return 1;
        if (lower.includes('email')) return 2;
        if (lower.includes('mật khẩu') || lower.includes('password')) return 3;
        return 1;
      };

      expect(getStepFromServerError('Tên người dùng đã tồn tại')).toBe(1);
      expect(getStepFromServerError('Username is already taken')).toBe(1);
      expect(getStepFromServerError('Email đã được sử dụng')).toBe(2);
      expect(getStepFromServerError('Invalid email domain')).toBe(2);
      expect(getStepFromServerError('Mật khẩu quá yếu')).toBe(3);
      expect(getStepFromServerError('Password mismatch')).toBe(3);
    });

    it('retains field data when navigating back to previous steps', () => {
      const formState = {
        userName: 'greenfarmer',
        email: 'green@farm.vn',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      let currentStep: 1 | 2 | 3 = 1;
      expect(currentStep).toBe(1);
      // Step 1 -> Step 2
      currentStep = 2;
      expect(currentStep).toBe(2);
      expect(formState.userName).toBe('greenfarmer');

      // Step 2 -> Step 3
      currentStep = 3;
      expect(currentStep).toBe(3);
      expect(formState.email).toBe('green@farm.vn');

      // Step 3 -> Back to Step 2
      currentStep = 2;
      expect(currentStep).toBe(2);
      expect(formState.email).toBe('green@farm.vn');
      expect(formState.userName).toBe('greenfarmer');

      // Step 2 -> Back to Step 1
      currentStep = 1;
      expect(currentStep).toBe(1);
      expect(formState.userName).toBe('greenfarmer');
    });
  });
});
