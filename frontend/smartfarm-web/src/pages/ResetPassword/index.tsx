import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { resetPassword } from '../../services/auth-service';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const { t, language } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!newPassword) {
      nextErrors.newPassword = t('auth_error_password_required', 'Vui lòng nhập mật khẩu.');
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = t('auth_error_password_length', 'Mật khẩu phải có tối thiểu 8 ký tự.');
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t('auth_error_confirm_password_required', 'Vui lòng xác nhận mật khẩu.');
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = t('auth_error_password_mismatch', 'Mật khẩu xác nhận không khớp.');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    if (!email || !token) {
      setSubmitError(t('auth_reset_password_invalid_token', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await resetPassword({
        email,
        token,
        newPassword,
        confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t('auth_reset_password_invalid_token', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth_reset_password_title', 'Đặt lại mật khẩu')}
      subtitle={t('auth_reset_password_subtitle', 'Tạo mật khẩu mới cho tài khoản của bạn.')}
      eyebrow={t('auth_reset_password_eyebrow', 'BẢO MẬT TÀI KHOẢN')}
    >
      <div className="space-y-4">
        {/* Missing email or token URL warning */}
        {(!email || !token) && !isSuccess && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">
                {t('auth_reset_password_invalid_token', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')}
              </p>
              <Link to="/forgot-password" className="underline hover:text-rose-900 font-bold">
                {t('auth_request_new_reset_link', 'Yêu cầu liên kết mới')}
              </Link>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <p>{submitError}</p>
              <Link to="/forgot-password" className="inline-block text-xs font-bold underline hover:text-rose-950 dark:hover:text-rose-100">
                {t('auth_request_new_reset_link', 'Yêu cầu liên kết mới')}
              </Link>
            </div>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-5 text-center animate-in fade-in duration-300">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-ink">
                {t('auth_reset_password_success', 'Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập bằng mật khẩu mới.')}
              </h3>
            </div>

            <Link
              to="/login"
              className="inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              <span>{t('auth_login_now', 'Đăng nhập ngay')}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                {t('auth_new_password_label', 'Mật khẩu mới')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock className="size-4" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={t('auth_new_password_placeholder', 'Tối thiểu 8 ký tự')}
                  disabled={isSubmitting || !email || !token}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, newPassword: '' }));
                    setSubmitError('');
                  }}
                  className={`w-full rounded-xl border bg-surface pl-10 pr-20 py-3 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                    errors.newPassword
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-line focus:border-primary focus:ring-primary/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? (language === 'en' ? 'Hide password' : 'Ẩn mật khẩu') : (language === 'en' ? 'Show password' : 'Hiện mật khẩu')}
                  className="absolute inset-y-0 right-2 flex items-center gap-1 px-2.5 text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}</span>
                </button>
              </div>
              {errors.newPassword && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                {t('auth_confirm_password_label', 'Xác nhận mật khẩu')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <KeyRound className="size-4" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder={t('auth_confirm_password_placeholder', 'Nhập lại mật khẩu của bạn')}
                  disabled={isSubmitting || !email || !token}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    setSubmitError('');
                  }}
                  className={`w-full rounded-xl border bg-surface pl-10 pr-20 py-3 text-sm font-medium text-ink shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                    errors.confirmPassword
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-line focus:border-primary focus:ring-primary/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? (language === 'en' ? 'Hide password' : 'Ẩn mật khẩu') : (language === 'en' ? 'Show password' : 'Hiện mật khẩu')}
                  className="absolute inset-y-0 right-2 flex items-center gap-1 px-2.5 text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showConfirmPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}</span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !token}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t('auth_submitting_reset_password', 'Đang cập nhật…')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth_submit_reset_password', 'Đặt lại mật khẩu')}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
              >
                {t('auth_back_to_login', 'Quay lại đăng nhập')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
