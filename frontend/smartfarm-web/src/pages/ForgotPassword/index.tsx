import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { forgotPassword } from '../../services/auth-service';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      await forgotPassword({ email: email.trim() });
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth_forgot_password_title', 'Quên mật khẩu')}
      subtitle={t('auth_forgot_password_subtitle', 'Nhập địa chỉ email của bạn để nhận hướng dẫn đặt lại mật khẩu.')}
      eyebrow={t('auth_forgot_password_eyebrow', 'KHÔI PHỤC TÀI KHOẢN')}
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-5 text-center animate-in fade-in duration-300">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-ink">
                {t('auth_forgot_password_success', 'Nếu email hợp lệ, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.')}
              </h3>
              <p className="text-xs text-muted">
                Kiểm tra cả thư mục Spam hoặc Hộp thư rác nếu bạn không thấy email trong vài phút.
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              <ArrowLeft className="size-4" />
              <span>{t('auth_back_to_login', 'Quay lại đăng nhập')}</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                {t('auth_email_label', 'Email')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Mail className="size-4" />
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="ban@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-3 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t('auth_submitting_forgot_password', 'Đang gửi…')}</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>{t('auth_submit_forgot_password', 'Gửi liên kết đặt lại')}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                <span>{t('auth_back_to_login', 'Quay lại đăng nhập')}</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
