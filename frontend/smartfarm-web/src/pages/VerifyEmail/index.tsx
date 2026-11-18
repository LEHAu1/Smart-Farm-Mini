import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { verifyEmail, resendVerificationEmail } from '../../services/auth-service';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, Mail, Send } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const token = searchParams.get('token') || '';

  const { t } = useLanguage();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (!userId || !token) {
      setStatus('error');
      setMessage(t('auth_verify_email_failed', 'Xác minh email thất bại hoặc liên kết đã hết hạn.'));
      return;
    }

    async function executeVerification() {
      try {
        const response = await verifyEmail({ userId, token });
        setStatus('success');
        setMessage(response.message || t('auth_verify_email_success', 'Email đã được xác minh thành công! Bạn có thể đăng nhập ngay.'));
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('auth_verify_email_failed', 'Xác minh email thất bại hoặc liên kết đã hết hạn.'));
      }
    }

    executeVerification();
  }, [userId, token, t]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || isResending) return;

    setIsResending(true);
    setResendError('');
    setResendStatusMessage('');

    try {
      await resendVerificationEmail({ email: resendEmail.trim() });
      setResendStatusMessage(t('auth_resend_verification_success', 'Đã gửi lại email xác minh! Vui lòng kiểm tra hộp thư của bạn.'));
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'Không thể gửi lại email xác minh. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth_verify_email_title', 'Xác minh email')}
      subtitle={t('auth_verify_email_subtitle', 'Đang tiến hành xác minh địa chỉ email của bạn.')}
      eyebrow={t('auth_verify_email_eyebrow', 'XÁC THỰC TÀI KHOẢN')}
    >
      <div className="space-y-6">
        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-ink">
              {t('auth_verifying_email', 'Đang xác minh email, vui lòng đợi trong giây lát…')}
            </p>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="space-y-5 text-center animate-in fade-in duration-300">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-ink">
                {t('auth_verify_email_success', 'Email đã được xác minh thành công! Bạn có thể đăng nhập ngay.')}
              </h3>
              {message && message !== t('auth_verify_email_success') && (
                <p className="text-xs text-muted">{message}</p>
              )}
            </div>

            <Link
              to="/login"
              className="inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              <span>{t('auth_login_now', 'Đăng nhập ngay')}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">
                  {t('auth_verify_email_failed', 'Xác minh email thất bại hoặc liên kết đã hết hạn.')}
                </p>
                <p>{message}</p>
              </div>
            </div>

            {/* Resend Verification Form */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                {t('auth_resend_verification_email', 'Gửi lại email xác minh')}
              </h4>

              {resendStatusMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {resendStatusMessage}
                </div>
              )}

              {resendError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  {resendError}
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <Mail className="size-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="ban@example.com"
                    value={resendEmail}
                    disabled={isResending}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-2.5 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResending || !resendEmail.trim()}
                  className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>{t('auth_resending_verification_email', 'Đang gửi lại…')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>{t('auth_resend_verification_email', 'Gửi lại email xác minh')}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
              >
                {t('auth_back_to_login', 'Quay lại đăng nhập')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
