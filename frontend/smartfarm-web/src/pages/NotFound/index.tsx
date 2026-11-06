import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-6 text-2xl font-semibold">Không tìm thấy trang</h1>
        <p className="mt-3 text-muted">Đường dẫn này không tồn tại trong Smart Farm Mini.</p>
        <Link to="/dashboard" className="button mt-7">Về tổng quan</Link>
      </div>
    </main>
  )
}
