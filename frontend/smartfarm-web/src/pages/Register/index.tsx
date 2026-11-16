import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { register } from '../../services/auth-service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../contexts/ToastContext';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    displayName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.userName.trim()) {
      nextErrors.userName = 'Vui lòng nhập tên người dùng (username).';
    }
    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Email không đúng định dạng.';
    }
    if (!formData.password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Mật khẩu phải có tối thiểu 8 ký tự.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await register({
        userName: formData.userName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        displayName: formData.displayName.trim() || undefined,
        role: 'User',
      });

      success('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại.';
      setSubmitError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng ký tài khoản"
      subtitle="Bắt đầu kết nối các thiết bị IoT và tự động hóa vườn cây của bạn."
      eyebrow="THAM GIA SMART FARM MINI"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div role="alert" className="rounded-xl border border-danger-border bg-danger-subtle p-3.5 text-xs font-medium text-danger">
            {submitError}
          </div>
        )}

        <Input
          label="Tên đăng nhập (Username)"
          placeholder="vd: nguyenvana"
          value={formData.userName}
          onChange={(e) => handleChange('userName', e.target.value)}
          error={errors.userName}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Email"
          type="email"
          placeholder="ban@example.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Tên hiển thị (Tùy chọn)"
          placeholder="vd: Nguyễn Văn A"
          value={formData.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          disabled={isSubmitting}
        />

        <Input
          label="Mật khẩu"
          type="password"
          placeholder="Tối thiểu 8 ký tự, có chữ và số"
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          disabled={isSubmitting}
          required
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            leftIcon={<UserPlus className="size-4" />}
          >
            Đăng ký tài khoản
          </Button>
        </div>

        <p className="pt-2 text-center text-xs text-muted">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
