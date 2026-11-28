import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { register as apiRegister } from '../../services/auth-service';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getPasswordPolicyError } from '../../utils/validate-password';
import { calculateRegisterProgress, type PlantMood } from '../../components/auth/auth-plant-mood';
import type { SylvaLivingWorldVariant } from '../../components/threeui/sylva-living-world/SylvaLivingWorldScene';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { t, language } = useLanguage();

  // Locked to sequoia-mist for auth
  const authVariant: SylvaLivingWorldVariant = 'sequoia-mist';

  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    // Fallback for tests outside AuthProvider
  }

  // 3-Step Wizard state (1: Username, 2: Email, 3: Password & Confirm)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [plantMood, setPlantMood] = useState<PlantMood>('idle');

  // Input refs for automatic autofocus when switching steps
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Progressive growth strictly based on boolean field validities (never reading password secrets)
  const isUsernameValid = formData.userName.trim().length >= 3 && /^[a-zA-Z0-9_.-]+$/.test(formData.userName.trim());
  const isEmailValid = Boolean(formData.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()));
  const isPasswordValid = formData.password.length >= 8 && getPasswordPolicyError(formData.password) === null;
  const isConfirmValid = Boolean(formData.confirmPassword && formData.confirmPassword === formData.password);

  const plantProgress = calculateRegisterProgress({
    username: isUsernameValid,
    email: isEmailValid,
    password: isPasswordValid,
    confirm: isConfirmValid,
  });

  // Autofocus first input of each step
  useEffect(() => {
    if (currentStep === 1) {
      usernameInputRef.current?.focus();
    } else if (currentStep === 2) {
      emailInputRef.current?.focus();
    } else if (currentStep === 3) {
      passwordInputRef.current?.focus();
    }
  }, [currentStep]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError('');
    setPlantMood('focus');
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.userName.trim()) {
      nextErrors.userName = t('auth_error_username_required', 'Vui lòng nhập tên người dùng.');
    } else if (formData.userName.trim().length < 3) {
      nextErrors.userName = language === 'en' ? 'Username must be at least 3 characters.' : 'Tên người dùng phải có tối thiểu 3 ký tự.';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.userName.trim())) {
      nextErrors.userName = language === 'en' ? 'Username contains invalid characters.' : 'Tên người dùng chỉ được chứa chữ, số, dấu gạch dưới hoặc gạch ngang.';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (nextErrors.userName) {
      setPlantMood('error');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      nextErrors.email = t('auth_error_email_required', 'Vui lòng nhập địa chỉ email.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = t('auth_error_email_invalid', 'Email không đúng định dạng.');
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (nextErrors.email) {
      setPlantMood('error');
      return false;
    }
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const nextErrors: Record<string, string> = {};

    const passwordError = getPasswordPolicyError(formData.password);
    if (passwordError === 'required') {
      nextErrors.password = t('auth_error_password_required', 'Vui lòng nhập mật khẩu.');
    } else if (passwordError === 'minLength') {
      nextErrors.password = t('auth_error_password_length', 'Mật khẩu phải có tối thiểu 8 ký tự.');
    } else if (passwordError === 'lowercase') {
      nextErrors.password = t('auth_error_password_lowercase', 'Mật khẩu phải có ít nhất một chữ cái viết thường.');
    } else if (passwordError === 'digit') {
      nextErrors.password = t('auth_error_password_digit', 'Mật khẩu phải có ít nhất một chữ số.');
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = t('auth_error_confirm_password_required', 'Vui lòng xác nhận mật khẩu.');
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = t('auth_error_password_mismatch', 'Mật khẩu xác nhận không khớp.');
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (nextErrors.password || nextErrors.confirmPassword) {
      setPlantMood('error');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setPlantMood('idle');
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        setPlantMood('idle');
      }
    }
  };

  const handleBack = () => {
    setSubmitError('');
    if (currentStep === 2) {
      setCurrentStep(1);
      setPlantMood('idle');
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setPlantMood('idle');
    }
  };

  // Support advancing steps on Enter key press
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (currentStep < 3) {
        e.preventDefault();
        handleNext();
      }
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        userName: formData.userName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        displayName: formData.displayName.trim() || undefined,
      };

      if (authContext) {
        await authContext.register(payload);
      } else {
        await apiRegister(payload);
      }

      setPlantMood('success');
      success(t('auth_register_success', 'Tạo tài khoản thành công! Đang chuyển hướng...'));
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setPlantMood('error');
      const msg =
        err instanceof Error
          ? err.message
          : language === 'en'
          ? 'Registration failed. Please try again.'
          : 'Đăng ký không thành công. Vui lòng thử lại.';
      setSubmitError(msg);
      toastError(msg);

      // Automatically route user to the step containing the server-reported error
      const lower = msg.toLowerCase();
      if (lower.includes('tên người dùng') || lower.includes('username')) {
        setCurrentStep(1);
      } else if (lower.includes('email')) {
        setCurrentStep(2);
      } else if (lower.includes('mật khẩu') || lower.includes('password')) {
        setCurrentStep(3);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth_register_title', 'Tạo tài khoản')}
      subtitle={t('auth_register_subtitle', 'Tạo tài khoản để bắt đầu theo dõi và chăm sóc vườn cây thông minh.')}
      eyebrow={t('auth_register_eyebrow', 'BẮT ĐẦU CÙNG SMART FARM')}
      plantMood={plantMood}
      plantProgress={plantProgress}
      bgVariant={authVariant}
    >
      <div className="space-y-4">
        {/* ── Accessible Stepper Indicator (aria-current="step" & aria-live) ── */}
        <div className="space-y-2 pb-1" aria-label="Tiến trình đăng ký">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
            <span aria-live="polite">
              {language === 'en' ? `Step ${currentStep} of 3` : `Bước ${currentStep}/3`}
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {currentStep === 1
                ? (language === 'en' ? 'Account identity' : 'Tên tài khoản')
                : currentStep === 2
                ? (language === 'en' ? 'Email address' : 'Địa chỉ email')
                : (language === 'en' ? 'Secure password' : 'Mật khẩu bảo vệ')}
            </span>
          </div>

          {/* Stepper Pills */}
          <ol className="flex items-center gap-2" role="list">
            {[1, 2, 3].map((step) => {
              const isActive = currentStep === step;
              const isPast = currentStep > step;
              return (
                <li
                  key={step}
                  className="flex-1"
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-primary shadow-xs ring-2 ring-primary/30'
                        : isPast
                        ? 'bg-emerald-500/80'
                        : 'bg-white/20 dark:bg-slate-700/50'
                    }`}
                  />
                </li>
              );
            })}
          </ol>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="space-y-3.5">
          {/* ══════════════ STEP 1: USERNAME & OPTIONAL DISPLAY NAME ══════════════ */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-200">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="reg-username"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5"
                >
                  {t('auth_username_label', 'Tên người dùng')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="size-4" />
                  </div>
                  <input
                    ref={usernameInputRef}
                    id="reg-username"
                    name="userName"
                    type="text"
                    autoComplete="username"
                    placeholder={t('auth_username_placeholder', 'vd: nguyenvana')}
                    required
                    disabled={isSubmitting}
                    value={formData.userName}
                    onChange={(e) => handleChange('userName', e.target.value)}
                    onFocus={() => setPlantMood('focus')}
                    onBlur={() => setPlantMood('idle')}
                    aria-invalid={Boolean(errors.userName)}
                    aria-describedby={errors.userName ? 'username-error' : undefined}
                    className={`w-full min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-4 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                      errors.userName
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-line focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                </div>
                {errors.userName && (
                  <p id="username-error" role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.userName}
                  </p>
                )}
              </div>

              {/* Display Name Field (Optional, preserved for existing user profile flexibility) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-display-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white"
                  >
                    {t('auth_display_name_label', 'Tên hiển thị (Tùy chọn)')}
                  </label>
                  <span className="text-[11px] text-muted italic">Optional</span>
                </div>
                <input
                  id="reg-display-name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder={t('auth_display_name_placeholder', 'vd: Nguyễn Văn A')}
                  disabled={isSubmitting}
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  onFocus={() => setPlantMood('focus')}
                  onBlur={() => setPlantMood('idle')}
                  className="w-full min-h-[48px] rounded-xl border border-line/80 bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface px-4 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
                />
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full min-h-[48px] sm:min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 active:scale-[0.98] text-white font-semibold text-sm sm:text-base shadow-md shadow-emerald-800/25 hover:shadow-lg hover:shadow-emerald-800/35 transition-all touch-manipulation flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  <span>{language === 'en' ? 'Continue to Email' : 'Tiếp tục sang Email'}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 2: EMAIL ADDRESS ══════════════ */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-200">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5"
                >
                  {t('auth_email_label', 'Email')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="size-4" />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth_email_placeholder', 'ban@example.com')}
                    required
                    disabled={isSubmitting}
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onFocus={() => setPlantMood('focus')}
                    onBlur={() => setPlantMood('idle')}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`w-full min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-4 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                      errors.email
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-line focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Step 2 Actions (Back & Next) */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 min-h-[48px] sm:min-h-[50px] rounded-xl glass-button-secondary text-ink font-semibold text-sm transition-all touch-manipulation flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  <span>{language === 'en' ? 'Back' : 'Quay lại'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-[2] min-h-[48px] sm:min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 active:scale-[0.98] text-white font-semibold text-sm sm:text-base shadow-md shadow-emerald-800/25 hover:shadow-lg transition-all touch-manipulation flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  <span>{language === 'en' ? 'Set Password' : 'Đặt mật khẩu'}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3: PASSWORD & CONFIRM ══════════════ */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-200">
              {/* Password Field */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5"
                >
                  {t('auth_password_label', 'Mật khẩu')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="size-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth_password_placeholder', 'Tối thiểu 8 ký tự')}
                    required
                    disabled={isSubmitting}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onFocus={() => setPlantMood('focus')}
                    onBlur={() => setPlantMood('idle')}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={`w-full min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-16 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                      errors.password
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-line focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="absolute inset-y-0 right-1 sm:right-2 flex items-center justify-center min-w-[44px] min-h-[44px] text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none touch-manipulation"
                    aria-label={showPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    <span className="ml-1 hidden xs:inline">
                      {showPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5"
                >
                  {t('auth_confirm_password_label', 'Xác nhận mật khẩu')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="size-4" />
                  </div>
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth_confirm_password_placeholder', 'Nhập lại mật khẩu của bạn')}
                    required
                    disabled={isSubmitting}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onFocus={() => setPlantMood('focus')}
                    onBlur={() => setPlantMood('idle')}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    className={`w-full min-h-[48px] rounded-xl border bg-surface/80 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-surface pl-10 pr-16 py-2.5 text-base sm:text-sm font-medium text-ink shadow-2xs focus:shadow-xs transition-all placeholder:text-muted focus:outline-none focus:ring-4 disabled:opacity-60 ${
                      errors.confirmPassword
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-line focus:border-primary focus:ring-primary/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    className="absolute inset-y-0 right-1 sm:right-2 flex items-center justify-center min-w-[44px] min-h-[44px] text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none touch-manipulation"
                    aria-label={showConfirmPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    <span className="ml-1 hidden xs:inline">
                      {showConfirmPassword ? t('auth_hide_password', 'Ẩn') : t('auth_show_password', 'Hiện')}
                    </span>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-password-error" role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Step 3 Actions (Back & Submit) */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[48px] sm:min-h-[50px] rounded-xl glass-button-secondary text-ink font-semibold text-sm transition-all touch-manipulation flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <ArrowLeft className="size-4" />
                  <span>{language === 'en' ? 'Back' : 'Quay lại'}</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] min-h-[48px] sm:min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 active:scale-[0.98] text-white font-semibold text-sm sm:text-base shadow-md shadow-emerald-800/25 hover:shadow-lg hover:shadow-emerald-800/35 transition-all touch-manipulation flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                      <span>{t('auth_submitting_register', 'Đang tạo…')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      <span>{t('auth_submit_register', 'Hoàn tất đăng ký')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Link back to Login */}
          <p className="pt-2 text-center text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            {t('auth_already_have_account', 'Đã có tài khoản?')}{' '}
            <Link to="/login" className="font-extrabold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline inline-block py-1.5 px-1 touch-manipulation">
              {t('auth_login_now', 'Đăng nhập ngay')}
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
