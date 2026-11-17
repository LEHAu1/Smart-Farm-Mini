import { PagePlaceholder } from '../../components/common/PagePlaceholder'
import { Card } from '../../components/common/Card'
import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <Card className="shadow-xs border-[var(--color-border,#e5eae5)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-main,#17251d)] tracking-tight">
          Đăng ký tài khoản
        </h1>
        <p className="text-sm text-[var(--color-text-muted,#647067)] mt-1.5">
          Tạo tài khoản quản lý nông trại IoT cá nhân của bạn.
        </p>
      </div>

      <PagePlaceholder
        pageNumber="STAGE 2 PREPARATION"
        title="Form Đăng ký"
        route="/register"
        description="Biểu mẫu đăng ký tài khoản người dùng cá nhân (mặc định Role User) sẽ được triển khai chi tiết ở Stage 2."
        keyFeatures={[
          'Tên hiển thị / DisplayName',
          'Địa chỉ Email xác thực',
          'Mật khẩu & Xác nhận mật khẩu',
          'Tích hợp POST /api/Auth/register',
        ]}
      />

      <div className="mt-5 pt-4 border-t border-[var(--color-border,#e5eae5)] text-center text-xs text-[var(--color-text-muted,#647067)]">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="font-semibold text-[var(--color-primary,#15803d)] hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </div>
    </Card>
  )
}
