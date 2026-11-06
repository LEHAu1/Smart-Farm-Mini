import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { demoCredentials, loginDemo } from '../../services/auth-service'
import { validateLogin } from '../../utils/validate-login'
import type { LoginCredentials, LoginErrors } from '../../types/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const submitting = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

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
      if (nextErrors.email) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }
    submitting.current = true
    setIsSubmitting(true)
    try {
      await loginDemo(credentials)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <aside className="login-story" aria-label="Smart Farm Mini">
        <div className="flex items-center gap-3 font-semibold"><span className="login-mark" aria-hidden="true">S</span> Smart Farm Mini</div>
        <div className="my-12 max-w-lg">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">Kết nối với khu vườn của bạn</span>
          <h2 className="mt-5 text-4xl font-semibold leading-tight lg:text-5xl">Chăm một mầm xanh.<br />Nuôi cả bình yên.</h2>
          <p className="mt-6 max-w-sm leading-8 text-emerald-100/80">Theo dõi cây trồng, giữ đất đủ ẩm và chăm sóc khu vườn từ một nơi duy nhất.</p>
          <div className="garden-art" aria-hidden="true"><span className="garden-stem" /><span className="garden-leaf garden-leaf-left" /><span className="garden-leaf garden-leaf-right" /><span className="garden-pot" /></div>
        </div>
        <p className="text-sm text-emerald-100/70">Một khu vườn nhỏ. Một khởi đầu xanh.</p>
      </aside>
      <section className="login-form-side" aria-labelledby="login-title">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 font-semibold text-primary lg:hidden"><span className="brand-icon" aria-hidden="true">S</span> Smart Farm Mini</div>
          <p className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</p>
          <h1 id="login-title" className="mt-3 text-3xl font-bold tracking-tight">Đăng nhập</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Khu vườn của bạn đang chờ được chăm sóc.</p>
          <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div>
              <label className="login-label" htmlFor="email">Email</label>
              <input ref={emailRef} className="login-input" id="email" name="email" type="email" autoComplete="username" placeholder="ban@example.com" required value={credentials.email} disabled={isSubmitting} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
              {errors.email && <p className="login-field-error" id="email-error" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label className="login-label" htmlFor="password">Mật khẩu</label>
              <div className="relative">
                <input ref={passwordRef} className="login-input pr-20" id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" required value={credentials.password} disabled={isSubmitting} onChange={(event) => updateField('password', event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                <button className="absolute inset-y-0 right-3 text-sm font-medium text-primary disabled:opacity-50" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} disabled={isSubmitting}>{showPassword ? 'Ẩn' : 'Hiện'}</button>
              </div>
              {errors.password && <p className="login-field-error" id="password-error" role="alert">{errors.password}</p>}
            </div>
            {submitError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{submitError}</div>}
            <button className="button min-h-12 w-full gap-3 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSubmitting}>
              {isSubmitting && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
          <div className="mt-7 rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-primary">Trải nghiệm bản demo</p>
            <p className="mt-1">Chưa kết nối xác thực backend. Dùng tài khoản mẫu bên dưới để thử giao diện.</p>
            <dl className="mt-3 space-y-1 text-xs"><div className="flex flex-wrap gap-1"><dt>Email:</dt><dd className="break-all font-medium text-ink">{demoCredentials.email}</dd></div><div className="flex flex-wrap gap-1"><dt>Mật khẩu:</dt><dd className="font-medium text-ink">{demoCredentials.password}</dd></div></dl>
            <button type="button" disabled={isSubmitting} className="mt-3 font-semibold text-primary underline underline-offset-4 disabled:opacity-50" onClick={() => { setCredentials({ ...demoCredentials }); setErrors({}); setSubmitError('') }}>Điền tài khoản demo</button>
          </div>
          <p className="mt-8 text-center text-xs text-muted">Smart Farm Mini · Chăm vườn thông minh, sống xanh mỗi ngày.</p>
        </div>
      </section>
    </main>
  )
}
