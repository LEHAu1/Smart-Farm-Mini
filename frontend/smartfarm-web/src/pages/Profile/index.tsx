import { PagePlaceholder } from '../../components/common/PagePlaceholder'

export default function ProfilePage() {
  return (
    <PagePlaceholder
      pageNumber="PAGE 12"
      title="Thông tin tài khoản"
      route="/profile"
      description="Quản lý thông tin cá nhân của chủ nông trại và bảo mật tài khoản."
      keyFeatures={[
        'Ảnh đại diện (Avatar) & Tên hiển thị (DisplayName)',
        'Email, Username, Số điện thoại liên hệ',
        'Cập nhật thông tin cá nhân',
        'Đổi mật khẩu tài khoản',
        'Đăng xuất khỏi hệ thống an toàn',
      ]}
    />
  )
}
