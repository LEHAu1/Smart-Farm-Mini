import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="panel w-full max-w-md !p-8" aria-labelledby="login-title">
        <span aria-hidden="true" className="brand-icon">S</span>
        <p className="eyebrow mt-6">SMART FARM MINI</p>
        <h1 id="login-title" className="mt-2 text-3xl font-bold">Đăng nhập</h1>
        <p className="mt-4 leading-7 text-muted">Trang đăng nhập đã có đường dẫn riêng. Form đăng nhập và xác thực sẽ được triển khai ở issue #6 và #7.</p>
        <p className="mt-5 rounded-lg bg-canvas p-4 text-sm text-muted">Bản khung hiện cho phép xem tổng quan mà không cần tài khoản.</p>
        <Link className="button mt-7 w-full" to="/dashboard">Xem tổng quan →</Link>
      </section>
    </main>
  )
}
