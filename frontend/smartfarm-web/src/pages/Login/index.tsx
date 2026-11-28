import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { loginDemo, loginWithGoogle } from '../../services/auth-service';
import { validateLogin } from '../../utils/validate-login';
import type { LoginCredentials, LoginErrors } from '../../types/auth';
import type { PlantMood } from '../../components/auth/auth-plant-mood';
import type { SylvaLivingWorldVariant } from '../../components/threeui/sylva-living-world/SylvaLivingWorldScene';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '480776599363-msu0jv4a0dl5js8h2kdn9nd4vo97ndga.apps.googleusercontent.com';
const isRealGoogleClientId = Boolean(
  GOOGLE_CLIENT_ID &&
  !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID') &&
  GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
);

function getSubmitErrorMessage(error: unknown, fallback = 'Không thể đăng nhập. Vui lòng thử lại.'): string {
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      response?: { data?: unknown };
    };
    const responseData = candidate.response?.data;
    if (responseData && typeof responseData === 'object') {
      const serverError = (responseData as { error?: unknown }).error;
      if (typeof serverError === 'string' && serverError.trim()) return serverError;
    }
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
  }
  return fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Locked to sequoia-mist for auth
  const authVariant: SylvaLivingWorldVariant = 'sequoia-mist';

  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    // Safe fallback for unit tests running outside AuthProvider
  }

  let langContext: ReturnType<typeof useLanguage> | null = null;
  try {
    langContext = useLanguage();
  } catch {
    // Safe fallback for unit tests running outside LanguageProvider
  }
  const t = langContext?.t || ((key: string, def?: string) => def ?? key);

  let themeContext: ReturnType<typeof useTheme> | null = null;
  try {
    themeContext = useTheme();
  } catch {
    // Safe fallback for unit tests
  }
  const isDark = themeContext?.theme === 'dark';

  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plantMood, setPlantMood] = useState<PlantMood>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const submitting = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Navigate with <=600ms atmospheric gateway transition or instant bypass
  const handleTransitionAndRedirect = (targetUrl: string) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTabHidden = typeof document !== 'undefined' && document.hidden;

    if (prefersReducedMotion || isTabHidden) {
      navigate(targetUrl, { replace: true });
      return;
    }

    setIsTransitioning(true);
    let didNavigate = false;

    const finish = () => {
      if (didNavigate) return;
      didNavigate = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', finish);
        window.removeEventListener('pointerdown', finish);
      }
      navigate(targetUrl, { replace: true });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', finish, { once: true });
      window.addEventListener('pointerdown', finish, { once: true });
    }

    setTimeout(finish, 450);
  };

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
    setPlantMood('focus');
  }

  async function handleGoogleSuccess(idToken: string) {
    if (isGoogleSubmitting || isSubmitting) return;
    setIsGoogleSubmitting(true);
    setSubmitError('');

    try {
      if (authContext) {
        await authContext.loginWithGoogle(idToken);
      } else {
        await loginWithGoogle({ idToken });
      }

      setPlantMood('success');
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      handleTransitionAndRedirect(returnUrl);
    } catch (error) {
      setPlantMood('error');
      setSubmitError(getSubmitErrorMessage(error, 'Đăng nhập Google thất bại. Vui lòng thử lại.'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  function handleGoogleCustomClick() {
    if (isRealGoogleClientId) {
      setSubmitError('Vui lòng chọn tài khoản trong hộp thoại Google hiển thị bên dưới.');
    } else {
      // In dev environment before setting up Google Cloud Console Client ID
      setSubmitError(
        'Chưa cấu hình Google Client ID thật trong file .env (VITE_GOOGLE_CLIENT_ID). Bạn có thể cấu hình Client ID từ Google Cloud Console hoặc dùng tài khoản Demo/Admin bên dưới để thử nghiệm.'
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || isGoogleSubmitting) return;

    const nextErrors = validateLogin(credentials);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length) {
      setPlantMood('error');
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);

    try {
      if (authContext) {
        await authContext.login({
          userNameOrEmail: credentials.email.trim(),
          password: credentials.password,
        });
      } else {
        await loginDemo(credentials);
      }

      setPlantMood('success');
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      handleTransitionAndRedirect(returnUrl);
    } catch (error) {
      setPlantMood('error');
      setSubmitError(getSubmitErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthLayout
        title={t('auth_login_title', 'Đăng nhập')}
        subtitle={t('auth_login_subtitle', 'Khu vườn của bạn đang chờ được chăm sóc.')}
        eyebrow={t('auth_login_eyebrow', 'CHÀO MỪNG BẠN TRỞ LẠI')}
        plantMood={plantMood}
        bgVariant={authVariant}
        isTransitioning={isTransitioning}
      >
        <div className="space-y-3.5">
          {/* Submit Error Alert */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200"
            >
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Google Sign-in Section */}
          <div className="w-full">
            {isRealGoogleClientId ? (
              <div className="w-full flex justify-center [&>div]:!w-full [&>div>iframe]:!w-full [&_iframe]:!w-full [&_iframe]:!max-w-full rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                <GoogleLogin
                  onSuccess={(credentialResponse: CredentialResponse) => {
                    if (credentialResponse.credential) {
                      handleGoogleSuccess(credentialResponse.credential);
                    }
                  }}
                  onError={() => {
                    setSubmitError('Đăng nhập Google thất bại hoặc bị hủy bỏ.');
                  }}
                  shape="rectangular"
                  theme={isDark ? 'filled_black' : 'outline'}
                  size="large"
                  text="signin_with"
                  width="380"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || isGoogleSubmitting}
                onClick={handleGoogleCustomClick}
                className="w-full min-h-[44px] rounded-xl border border-line/80 bg-surface/75 hover:bg-surface text-ink font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2.5 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Official Google G Logo SVG */}
                <svg className="size-4 sm:size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleSubmitting ? 'Đang xác thực Google…' : t('auth_google_login', 'Đăng nhập bằng Google')}</span>
              </button>
            )}
          </div>

          {/* Divider: Clean transparent background with subtle horizontal rules */}
          <div className="flex items-center gap-3 my-2.5 sm:my-3" aria-hidden="true">
            <div className="flex-1 h-px bg-slate-300 dark:bg-white/20" />
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 text-shadow-contrast select-none">
              {t('auth_or_divider', 'HOẶC TIẾP TỤC VỚI EMAIL')}
            </span>
            <div className="flex-1 h-px bg-slate-300 dark:bg-white/20" />
          </div>

          {/* Traditional Email / Password Form */}
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-3 sm:space-y-3.5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                {t('auth_email_label', 'Email')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 dark:text-slate-400">
                  <Mail className="size-4" />
                </div>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ban@example.com"
                  required
                  value={credentials.email}
                  disabled={isSubmitting || isGoogleSubmitting}
                  onChange={(event) => updateField('email', event.target.value)}
                  onFocus={() => setPlantMood('focus')}
                  onBlur={() => setPlantMood('idle')}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`w-full min-h-[44px] sm:min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-4 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted/60 focus:outline-none focus:ring-4 disabled:bg-canvas disabled:text-muted ${
                    errors.email
                      ? 'border-danger focus:border-danger focus:ring-danger/10'
                      : 'border-line focus:border-primary focus:ring-primary/15'
                  }`}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs font-medium text-danger flex items-center gap-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t('auth_password_label', 'Mật khẩu')}
                </label>
                <span
                  className="text-xs text-slate-800 dark:text-slate-100 cursor-not-allowed select-none inline-flex items-center gap-1.5"
                  title="Chức năng đang phát triển"
                >
                  <span className="font-semibold text-shadow-contrast">
                    {langContext?.language === 'en' ? 'Forgot password?' : 'Quên mật khẩu?'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 dark:bg-emerald-400/20 border border-emerald-600/40 dark:border-emerald-400/40 px-1.5 py-0.5 rounded text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs">
                    {langContext?.language === 'en' ? 'Soon' : 'Sắp có'}
                  </span>
                </span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock className="size-4" />
                </div>
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  value={credentials.password}
                  disabled={isSubmitting || isGoogleSubmitting}
                  onChange={(event) => updateField('password', event.target.value)}
                  onFocus={() => setPlantMood('focus')}
                  onBlur={() => setPlantMood('idle')}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`w-full min-h-[44px] sm:min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-16 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted/60 focus:outline-none focus:ring-4 disabled:bg-canvas disabled:text-muted ${
                    errors.password
                      ? 'border-danger focus:border-danger focus:ring-danger/10'
                      : 'border-line focus:border-primary focus:ring-primary/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? (langContext?.language === 'en' ? 'Hide password' : 'Ẩn mật khẩu') : (langContext?.language === 'en' ? 'Show password' : 'Hiện mật khẩu')}
                  aria-pressed={showPassword}
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="absolute inset-y-0 right-1 sm:right-2 flex items-center justify-center min-w-[44px] min-h-[44px] text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none touch-manipulation disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="ml-1 hidden xs:inline">{showPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}</span>
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs font-medium text-danger flex items-center gap-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button with Gradient and Depth */}
            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full min-h-[46px] sm:min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 active:scale-[0.98] text-white font-semibold text-sm sm:text-base shadow-md shadow-emerald-800/25 hover:shadow-lg hover:shadow-emerald-800/35 transition-all touch-manipulation flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70 mt-1"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  <span>{t('auth_submitting_login', 'Đang đăng nhập…')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth_submit_login', 'Đăng nhập')}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {t('auth_no_account', 'Chưa có tài khoản?')}{' '}
            <Link to="/register" className="font-extrabold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline inline-block py-1.5 px-1 touch-manipulation">
              {t('auth_register_now', 'Đăng ký ngay')}
            </Link>
          </div>
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
}
