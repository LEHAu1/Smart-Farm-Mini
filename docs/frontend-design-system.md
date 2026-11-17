# HỆ THỐNG THIẾT KẾ GIAO DIỆN FRONTEND (DESIGN SYSTEM & TOKENS)
Dự án: **Smart Farm Mini - IoT Smart Agriculture**  
Quy chuẩn: **Impeccable Design Standards (Operate Mode)**  
Phiên bản: **1.0.0 (Stage 0 Discovery)**

---

## 1. ĐỊNH HƯỚNG THẨM MỸ (VISUAL DIRECTION)

Smart Farm Mini là nền tảng SaaS IoT phục vụ việc giám sát nông nghiệp thông minh và điều khiển tự động hóa.
- **Phong cách chủ đạo**: **Premium Smart Agriculture IoT SaaS** — Chuyên nghiệp, hiện đại, chính xác và đáng tin cậy.
- **Nguyên lý Operate Mode (Impeccable)**:
  - **Công cụ phục vụ tác vụ**: Giao diện tập trung tối đa vào khả năng quét thông tin (scanability), tốc độ thao tác và sự rõ ràng của số liệu cảm biến.
  - **Không lạm dụng hiệu ứng**: Tuyệt đối không dùng gradient màu mè, không dùng hiệu ứng kính mờ (glassmorphism) gây giảm độ tương phản, không dùng shadow quá gắt hoặc hoạt ảnh thừa thãi làm gián đoạn người dùng.
  - **Không dùng emoji làm icon chính**: Sử dụng đồng nhất bộ icon SVG nét mảnh chuẩn mực từ thư viện `lucide-react`.
  - **Độ chính xác số liệu**: Các chỉ số cảm biến (Nhiệt độ, Độ ẩm đất, Mực nước) luôn được định dạng với phông chữ dạng số cố định (tabular figures), đi kèm đơn vị rõ ràng (`%`, `°C`, `ml`, `giây`).

---

## 2. BẢNG MÀU THỐNG NHẤT (COLOR PALETTE & DESIGN TOKENS)

Màu sắc tuân thủ bảng mã semantic chặt chẽ, tối ưu độ tương phản chuẩn WCAG AA:

| Vai trò Token | Mã Hex | Tên biến CSS / Tailwind | Mục đích sử dụng |
|:---|:---|:---|:---|
| **Primary** | `#15803D` | `--color-primary` / `bg-primary` | Màu nhận diện nông nghiệp thông minh: Nút bấm chính, tab đang chọn, chỉ số quan trọng |
| **Primary Hover** | `#166534` | `--color-primary-hover` | Trạng thái hover của nút bấm và liên kết chính |
| **Primary Light** | `#DCFCE7` | `--color-primary-light` | Màu nền badge thành công, nền highlight thông tin |
| **Secondary** | `#0F766E` | `--color-secondary` | Màu điểm nhấn thứ cấp: Biểu đồ phụ, phân vùng cảm biến nước |
| **Main Background** | `#F8FAF7` | `--color-bg-main` | Màu nền toàn ứng dụng (nền sáng dịu mắt, pha chút ánh xanh thảo mộc nhẹ) |
| **Surface / Card** | `#FFFFFF` | `--color-surface` | Màu nền các thẻ card, sidebar, header, modal, bảng dữ liệu |
| **Main Text** | `#17251D` | `--color-text-main` | Màu chữ chính, tiêu đề (độ tương phản 12.8:1 trên nền trắng) |
| **Muted Text** | `#647067` | `--color-text-muted` | Màu chữ phụ, nhãn mô tả, timestamp (độ tương phản 5.2:1) |
| **Border** | `#E5EAE5` | `--color-border` | Màu đường viền thẻ card, bảng dữ liệu, phân cách |
| **Border Strong**| `#D0D9D1` | `--color-border-strong` | Màu viền input khi ở trạng thái bình thường |
| **Success** | `#16A34A` | `--color-success` | Trạng thái Online, tưới thành công, quy tắc đang bật |
| **Warning** | `#D97706` | `--color-warning` | Cảnh báo mức Warning, mực nước bồn tưới sắp cạn |
| **Danger** | `#DC2626` | `--color-danger` | Cảnh báo Critical, thiết bị Offline sự cố, nút xóa |
| **Info** | `#0284C7` | `--color-info` | Chỉ số độ ẩm, thông báo hệ thống, chế độ tưới Auto |

---

## 3. NGHỆ THUẬT CHỮ & TYPOGRAPHY

- **Phông chữ chính**: **Be Vietnam Pro** (được nhúng qua `@fontsource/be-vietnam-pro`). Đây là font sans-serif hình học hiện đại, hiển thị dấu tiếng Việt hoàn hảo, cân bằng tốt giữa chữ cái và chữ số.
- **Tỉ lệ bước phông (Scale Ratio)**: Tỉ lệ bước nhảy chặt chẽ (1.125 – 1.25) phù hợp đặc thù phần mềm vận hành:
  - `Display / Large Metric`: `32px` / `2rem`, `font-bold`, `tracking-tight` (dùng cho giá trị cảm biến lớn trên Dashboard).
  - `Heading 1`: `24px` / `1.5rem`, `font-semibold` (tiêu đề trang).
  - `Heading 2`: `18px` / `1.125rem`, `font-semibold` (tiêu đề nhóm thẻ card).
  - `Heading 3`: `16px` / `1rem`, `font-medium` (tiêu đề card nhỏ).
  - `Body Regular`: `14px` / `0.875rem`, `font-normal` (nội dung bảng, form nhãn).
  - `Caption / Subtext`: `12px` / `0.75rem`, `font-normal`, `text-muted` (ghi chú thời gian, timestamp).

---

## 4. KHOẢNG CÁCH (SPACING) & BÁN KÍNH BO GÓC (RADIUS)

### 4.1. Hệ thống Spacing (Base 4px)
- `gap-1` / `p-1`: `4px` — Khoảng cách icon và text trong badge.
- `gap-2` / `p-2`: `8px` — Khoảng cách padding nhỏ, nút phụ.
- `gap-3` / `p-3`: `12px` — Khoảng cách trường nhập liệu input.
- `gap-4` / `p-4`: `16px` — Padding tiêu chuẩn của Card, Metric Card.
- `gap-6` / `p-6`: `24px` — Khoảng cách giữa các cột trong Grid Layout.
- `gap-8` / `p-8`: `32px` — Khoảng cách giữa các khối chức năng lớn trên trang.

### 4.2. Bo góc (Border Radius)
- `rounded-sm`: `4px` — Tag nhỏ, checkbox.
- `rounded-md`: `6px` — Input form, select, button nhỏ.
- `rounded-lg`: `8px` — Button chuẩn, dialog nhỏ.
- `rounded-xl`: `12px` — Card container, modal, popover.
- `rounded-full`: `9999px` — Badge trạng thái, avatar tròn.

---

## 5. THƯ VIỆN COMPONENT TIÊU CHUẨN (CORE COMPONENTS)

Mọi component đều bắt buộc phải có đầy đủ 7 trạng thái tương tác:
`Default` | `Hover` | `Focus-Visible` | `Active` | `Disabled` | `Loading (Skeleton)` | `Error`

1. **Button**:
   - `Primary`: Nền `#15803D`, chữ trắng.
   - `Secondary`: Nền trắng, viền `#E5EAE5`, chữ `#17251D`.
   - `Danger`: Nền `#DC2626`, chữ trắng (dùng cho nút dừng bơm khẩn cấp, xóa thiết bị).
   - `Ghost`: Nền trong suốt, hover nền xám nhạt (nút điều hướng phụ).
   - Hỗ trợ cờ `isLoading` hiển thị spinner tích hợp và chặn click lặp.
2. **MetricCard**:
   - Thể hiện một chỉ số đo lường (Độ ẩm đất, Nhiệt độ, Mực nước).
   - Gồm: Icon chủ đề, nhãn thông số, giá trị lớn (kèm đơn vị), xu hướng biến thiên hoặc trạng thái an toàn/nguy hiểm.
   - Tích hợp sẵn `LoadingSkeleton` dạng khối nhấp nháy êm dịu khi đang tải API.
3. **StatusIndicator & Badge**:
   - Chấm tròn trạng thái (Status Dot) có hiệu ứng pulse nhẹ khi thiết bị đang Online hoặc máy bơm đang chạy.
   - Badge ngữ nghĩa màu sắc: Xanh (Online/Normal), Vàng (Warning/Pending), Đỏ (Critical/Offline).
4. **Input & Select**:
   - Viền xám trung tính, khi focus hiển thị vòng sáng xanh tinh tế (`ring-2 ring-primary/20 border-primary`).
   - Có vị trí hiển thị lỗi validation tiếng Việt bên dưới rõ ràng.
5. **EmptyState**:
   - Hiển thị khi danh sách trống (chưa có thiết bị, chưa có lịch sử tưới).
   - Minh họa đơn giản, thông điệp hướng dẫn cụ thể và nút kêu gọi hành động (Call to Action) để người dùng tạo mới.
6. **Toast Notification**:
   - Thông báo kết quả thao tác tức thì góc trên bên phải (Thành công, Thất bại, Cảnh báo mới) với thời gian tự biến mất 4 giây.
7. **Confirmation Dialog**:
   - Xác nhận trước các hành động quan trọng (Bật bơm thủ công, Xóa quy tắc tưới, Vô hiệu hóa thiết bị) để ngăn chặn thao tác nhầm lẫn.

---

## 6. QUY TẮC HIỆU ỨNG CHUYỂN ĐỘNG (MOTION & ACCESSIBILITY)

- **Thời lượng chuyển cảnh**: 150ms – 250ms với đường cong gia tốc tự nhiên (`ease-in-out`).
- Không tạo các hiệu ứng trễ (staggered animation) hay hiệu ứng lật trang rườm rà.
- **Tiêu chuẩn trợ năng (Accessibility)**:
  - Bắt buộc hỗ trợ đầy đủ bàn phím (`Tab`, `Enter`, `Escape`).
  - Đường viền focus luôn rõ ràng (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`).
  - Hỗ trợ `prefers-reduced-motion` cho người dùng nhạy cảm với chuyển động.

