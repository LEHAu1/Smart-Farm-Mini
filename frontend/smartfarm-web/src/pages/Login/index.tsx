import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { loginDemo, loginWithGoogle, resendVerificationEmail } from '../../services/auth-service';
import { validateLogin } from '../../utils/validate-login';
import type { LoginCredentials, LoginErrors } from '../../types/auth';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '847311755277-hkm959nlmjee42aiccr313pah9mtokd2.apps.googleusercontent.com';
const isRealGoogleClientId = Boolean(
  GOOGLE_CLIENT_ID &&
  !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID') &&
  GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);
  const [resendVerifyMessage, setResendVerifyMessage] = useState('');
  const submitting = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
    setIsEmailUnverified(false);
    setResendVerifyMessage('');
  }

  async function handleResendVerification() {
    if (!credentials.email.trim() || isResendingVerify) return;
    setIsResendingVerify(true);
    try {
      await resendVerificationEmail({ email: credentials.email.trim() });
      setResendVerifyMessage(t('auth_resend_verification_success', 'Đã gửi lại email xác minh! Vui lòng kiểm tra hộp thư của bạn.'));
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể gửi lại email xác minh.');
    } finally {
      setIsResendingVerify(false);
    }
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

      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      navigate(returnUrl, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.');
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
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setIsEmailUnverified(false);
    setResendVerifyMessage('');

    try {
      if (authContext) {
        await authContext.login({
          userNameOrEmail: credentials.email.trim(),
          password: credentials.password,
        });
      } else {
        await loginDemo(credentials);
      }

      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      navigate(returnUrl, { replace: true });
    } catch (error: unknown) {
      const isUnverified = (error as { errorCode?: string })?.errorCode === 'EMAIL_NOT_VERIFIED' ||
        (error instanceof Error && error.message.includes('EMAIL_NOT_VERIFIED'));
      setIsEmailUnverified(Boolean(isUnverified));
      setSubmitError(error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.');
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
      >
        <div className="space-y-4">
          {/* Submit Error Alert */}
          {submitError && !isEmailUnverified && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200"
            >
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Email Not Verified Alert */}
          {isEmailUnverified && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50/95 dark:bg-amber-950/40 dark:border-amber-800 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="font-semibold">
                  {t('auth_email_not_verified_alert', 'Email chưa được xác minh. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.')}
                </p>
              </div>
              {resendVerifyMessage ? (
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold">{resendVerifyMessage}</p>
              ) : (
                <button
                  type="button"
                  disabled={isResendingVerify}
                  onClick={handleResendVerification}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-60"
                >
                  {isResendingVerify ? t('auth_resending_verification_email', 'Đang gửi lại…') : t('auth_resend_verification_email', 'Gửi lại email xác minh')}
                </button>
              )}
            </div>
          )}

          {/* Google Sign-in Section */}
          <div className="space-y-2">
            {isRealGoogleClientId ? (
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={(credentialResponse: CredentialResponse) => {
                    if (credentialResponse.credential) {
                      handleGoogleSuccess(credentialResponse.credential);
                    }
                  }}
                  onError={() => {
                    setSubmitError('Đăng nhập Google thất bại hoặc bị hủy bỏ.');
                  }}
                  useOneTap
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  text="signin_with"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || isGoogleSubmitting}
                onClick={handleGoogleCustomClick}
                className="w-full min-h-[48px] rounded-xl border border-line bg-surface hover:bg-surface-hover text-ink font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Official Google G Logo SVG */}
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-muted font-semibold tracking-wider">
                {t('auth_or_divider', 'HOẶC TIẾP TỤC VỚI EMAIL')}
              </span>
            </div>
          </div>

          {/* Traditional Email / Password Form */}
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                {t('auth_email_label', 'Email')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
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
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`w-full rounded-xl border bg-surface pl-10 pr-4 py-3 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted/60 focus:outline-none focus:ring-4 disabled:bg-canvas disabled:text-muted ${
                    errors.email
                      ? 'border-danger focus:border-danger focus:ring-danger/10'
                      : 'border-line focus:border-primary focus:ring-primary/15'
                  }`}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1.5 text-xs font-medium text-danger flex items-center gap-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                {t('auth_password_label', 'Mật khẩu')}
              </label>
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
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`w-full rounded-xl border bg-surface pl-10 pr-20 py-3 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted/60 focus:outline-none focus:ring-4 disabled:bg-canvas disabled:text-muted ${
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
                  className="absolute inset-y-0 right-2 flex items-center gap-1 px-2.5 text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}</span>
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1.5 text-xs font-medium text-danger flex items-center gap-1">
                  {errors.password}
                </p>
              )}
              {/* Forgot password link below input */}
              <div className="flex justify-end mt-2">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                >
                  {t('auth_forgot_password_link', 'Quên mật khẩu?')}
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70 mt-2"
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
          <div className="mt-5 text-center text-xs text-muted">
            {t('auth_no_account', 'Chưa có tài khoản?')}{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-hover hover:underline">
              {t('auth_register_now', 'Đăng ký ngay')}
            </Link>
          </div>
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
}
