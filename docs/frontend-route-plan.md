# KẾ HOẠCH CẤU TRÚC ROUTING & ĐIỀU HƯỚNG FRONTEND (ROUTE PLAN)
Dự án: **Smart Farm Mini - IoT Smart Agriculture**  
Phiên bản: **1.0.0 (Stage 0 Discovery)**

---

## 1. NGUYÊN TẮC THIẾT KẾ ROUTING (IMPECCABLE OPERATE MODE)

1. **Rõ ràng, trực quan, phân cấp logic**: Các tài nguyên con của một thiết bị IoT (cảm biến, tưới nước) được nhóm theo đường dẫn chuẩn RESTful `/devices/:deviceId/...`.
2. **Bảo vệ tuyến đường (Route Guarding)**:
   - **Public Routes**: `/login`, `/register`. Nếu đã đăng nhập mà truy cập lại sẽ tự động chuyển hướng về `/dashboard`.
   - **Protected Routes**: Tất cả các trang còn lại đều được bọc trong `ProtectedRoute` (kiểm tra JWT Access Token hợp lệ, nếu không có hoặc hết hạn sẽ chuyển hướng về `/login` kèm `returnUrl`).
3. **Breadcrumbs & Tiêu đề trang động**: Header luôn hiển thị đường dẫn phân cấp (Ví dụ: `Trang chủ` / `Thiết bị` / `Vườn Cà Chua A1` / `Cảm biến`) giúp người dùng nắm bắt ngữ cảnh tức thì.
4. **Tương thích ngược (Backward Compatibility)**: Tự động chuyển hướng các đường dẫn cũ sang đường dẫn mới để tránh đứt gãy trải nghiệm.

---

## 2. BẢNG DANH SÁCH 11 TRANG CHÍNH & THÔNG SỐ ROUTE

| STT | Tên trang | Route Path | Layout | Quyền truy cập | Tiêu đề Trang (Document Title) | Chức năng chính |
|:---:|:---|:---|:---|:---:|:---|:---|
| **01** | **Login** | `/login` | `AuthLayout` | Public | Đăng nhập — Smart Farm Mini | Form đăng nhập email/mật khẩu, validation, ghi nhớ token JWT, hiển thị lỗi đăng nhập. |
| **02** | **Register** | `/register` | `AuthLayout` | Public | Đăng ký tài khoản — Smart Farm Mini | Form tạo tài khoản, validation mật khẩu tối thiểu 6 ký tự, chuyển hướng sau khi tạo thành công. |
| **03** | **Dashboard** | `/dashboard` | `AppLayout` | Protected | Tổng quan nông trại — Smart Farm Mini | Thẻ thống kê tổng số thiết bị, thiết bị online, nhiệt độ/độ ẩm trung bình, cảnh báo mới nhất, trạng thái máy bơm. |
| **04** | **Devices** | `/devices` | `AppLayout` | Protected | Danh sách thiết bị — Smart Farm Mini | Danh sách dạng thẻ/bảng, tìm kiếm tên/mã, lọc online/offline, kích hoạt/vô hiệu hóa, nút thêm thiết bị mới. |
| **05** | **Device Detail** | `/devices/:deviceId` | `AppLayout` | Protected | Chi tiết thiết bị — Smart Farm Mini | Thông tin phần cứng ESP32, trạng thái kết nối Online/Offline, thời gian kết nối cuối, chuyển đổi nhanh tab Cảm biến & Tưới. |
| **06** | **Sensor Monitoring** | `/devices/:deviceId/sensors` | `AppLayout` | Protected | Giám sát cảm biến — Smart Farm Mini | Thẻ giá trị hiện tại (độ ẩm đất, nhiệt độ khí, độ ẩm khí, nhiệt độ nước, mực nước), biểu đồ biến thiên 24h & thống kê 7 ngày. |
| **07** | **Irrigation** | `/devices/:deviceId/irrigation` | `AppLayout` | Protected | Điều khiển tưới — Smart Farm Mini | Nút bật/tắt bơm thủ công (Manual Command), danh sách quy tắc tưới tự động (Rules), bật/tắt rule, tạo/sửa rule. |
| **08** | **Alerts** | `/alerts` | `AppLayout` | Protected | Cảnh báo sự cố — Smart Farm Mini | Thống kê số lượng cảnh báo (Critical, Warning, Info), bộ lọc trạng thái đã/chưa xử lý, nút đánh dấu xử lý cảnh báo. |
| **09** | **Irrigation History** | `/irrigation-history` | `AppLayout` | Protected | Lịch sử tưới — Smart Farm Mini | Bảng các phiên tưới đã thực hiện, lọc theo thiết bị/chế độ (Auto/Manual), thời lượng, độ ẩm trước/sau, lượng nước. |
| **10** | **Command History** | `/commands` | `AppLayout` | Protected | Lịch sử lệnh điều khiển — Smart Farm Mini | Bảng theo dõi các lệnh gửi xuống ESP32, trạng thái lệnh (Pending, Acknowledged, Completed, Failed), lỗi nếu có. |
| **11** | **Profile & Settings** | `/profile` | `AppLayout` | Protected | Tài khoản & Cài đặt — Smart Farm Mini | Xem thông tin cá nhân, cập nhật DisplayName/Số điện thoại, đổi mật khẩu, đăng xuất an toàn. |

---

## 3. CÁC TUYẾN ĐƯỜNG ĐIỀU HƯỚNG PHỤ & CHUYỂN HƯỚNG (REDIRECTS)

```typescript
// Định tuyến trong React Router v7
<Routes>
  {/* Public Auth Routes */}
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Route>

  {/* Protected App Routes */}
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    
    {/* Quản lý thiết bị & tài nguyên con */}
    <Route path="/devices" element={<DevicesPage />} />
    <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
    <Route path="/devices/:deviceId/sensors" element={<SensorMonitoringPage />} />
    <Route path="/devices/:deviceId/irrigation" element={<IrrigationPage />} />
    
    {/* Cảnh báo, Lịch sử & Tài khoản */}
    <Route path="/alerts" element={<AlertsPage />} />
    <Route path="/irrigation-history" element={<IrrigationHistoryPage />} />
    <Route path="/commands" element={<CommandHistoryPage />} />
    <Route path="/profile" element={<ProfilePage />} />

    {/* Backward Compatibility Aliases */}
    <Route path="/irrigation-logs" element={<Navigate to="/irrigation-history" replace />} />
    <Route path="/settings" element={<Navigate to="/profile" replace />} />
    <Route path="/sensors" element={<Navigate to="/devices" replace />} />
    <Route path="/irrigation" element={<Navigate to="/devices" replace />} />
    <Route path="/history" element={<Navigate to="/irrigation-history" replace />} />
  </Route>

  {/* 404 Fallback */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

---

## 4. CẤU TRÚC SHELL LAYOUT (`AppLayout`)

Giao diện vận hành tác vụ (Operate Mode):
- **Desktop Sidebar**:
  - Logo Smart Farm Mini với badge trạng thái hệ thống.
  - Quick Device Selector: Cho phép chọn nhanh thiết bị đang theo dõi.
  - Nhóm điều hướng chính:
    - 📊 **Tổng quan**: `/dashboard`
    - 🌿 **Thiết bị**: `/devices`
    - 🔔 **Cảnh báo**: `/alerts` (kèm badge đếm số cảnh báo chưa xử lý)
    - 💧 **Lịch sử tưới**: `/irrigation-history`
    - ⚡ **Lịch sử lệnh**: `/commands`
    - 👤 **Tài khoản**: `/profile`
  - Nút thu gọn Sidebar (Collapsible) để mở rộng không gian quan sát dữ liệu.
- **Header**:
  - Breadcrumb tự động bám theo Route hiện tại.
  - Chuông thông báo (Notification Bell) hiển thị Popover tóm tắt cảnh báo nhanh (`GET /api/alerts/summary`).
  - Dropdown người dùng: Tên hiển thị, Email, link đến Profile, nút Đăng xuất.
- **Mobile Drawer**:
  - Tự động chuyển đổi thành Drawer vuốt mở trên màn hình nhỏ (< 1024px) để đảm bảo diện tích hiển thị biểu đồ và bảng dữ liệu.

