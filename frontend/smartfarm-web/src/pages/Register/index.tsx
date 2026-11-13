import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <PagePlaceholder
          pageNumber="PAGE 02"
          title="Đăng ký tài khoản"
          route="/register"
          description="Tạo tài khoản người dùng cá nhân mới cho hệ thống Smart Farm Mini."
          keyFeatures={[
            'Full Name / Tên hiển thị',
            'Email & Username xác thực',
            'Mật khẩu & Xác nhận mật khẩu',
            'Độ mạnh mật khẩu (Password Strength Indicator)',
            'Validation & Thông báo lỗi',
            'Liên kết quay lại trang Đăng nhập',
          ]}
        />
      </div>
    </div>
  )
}
