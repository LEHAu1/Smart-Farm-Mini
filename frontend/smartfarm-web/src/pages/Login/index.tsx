import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth-service'
import { validateLogin } from '../../utils/validate-login'
import type { LoginCredentials, LoginErrors } from '../../types/auth'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Card } from '../../components/common/Card'
import { AlertTriangle, LogIn } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const nextErrors = validateLogin(credentials)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) {
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    try {
      await authService.login(credentials)
      const returnUrl = searchParams.get('returnUrl')
      const destination = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard'
      navigate(destination, { replace: true })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      setSubmitError(
        err.response?.data?.message ||
        (err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không chính xác.')
      )
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="shadow-xs border-[var(--color-border,#e5eae5)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main,#17251d)] tracking-tight">
          Đăng nhập
        </h1>
        <p className="text-sm text-[var(--color-text-muted,#647067)] mt-1.5">
          Nhập tài khoản để quản lý các thiết bị nông nghiệp thông minh của bạn.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-lg bg-[var(--color-danger-bg,#fef2f2)] border border-[var(--color-danger-border,#fecaca)] text-xs text-[var(--color-danger,#dc2626)] flex items-start gap-2.5"
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Địa chỉ Email"
          type="email"
          placeholder="admin@smartfarm.vn"
          required
          autoComplete="email"
          value={credentials.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
        />

        <Input
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          showPasswordToggle
          value={credentials.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-11 text-sm font-semibold"
            isLoading={isSubmitting}
            leftIcon={<LogIn className="size-4" />}
          >
            Đăng nhập hệ thống
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-[var(--color-border,#e5eae5)] flex flex-col gap-3 text-center text-xs text-[var(--color-text-muted,#647067)]">
        <div>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-semibold text-[var(--color-primary,#15803d)] hover:underline"
          >
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </Card>
  )
}
