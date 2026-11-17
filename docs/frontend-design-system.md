# Smart Farm Mini — Frontend Design System Specification

> **Đặc tả hệ thống thiết kế (Design System & UI Tokens) dành cho Frontend React 19 + Tailwind CSS v4**  
> **Phong cách:** Eco-Minimalism kết hợp Modern Technical Dashboard  
> **Mục tiêu:** Giao diện điều hành IoT nông nghiệp chính xác, thoáng đãng, dễ theo dõi, không lạm dụng hiệu ứng hay gradient rườm rà.

---

## 1. Triết Lý Thiết Kế & Định Hướng Thị Giác

1. **Chuẩn xác kỹ thuật & Đậm chất sinh thái (Eco-Minimalism):**
   - Sự kết hợp giữa sắc xanh lá nông nghiệp công nghệ (`#216348`) với sắc xanh dịu của nước (`#106493`) trên nền trắng ngà nhẹ (`#F8F9FF` / `#F7F9F5`).
   - Giảm thiểu tối đa mỏi mắt cho người dùng khi theo dõi telemetry liên tục hoặc sử dụng ngoài trời.
2. **Loại bỏ nhiễu hình ảnh:**
   - Không sử dụng gradient đa sắc, không dùng bóng đổ nặng nề (heavy drop-shadows).
   - Phân định các khối dữ liệu bằng đường viền mảnh 1px (`#E0E7E3` / `#E5E7EB`) và bóng vi sai siêu nhẹ (subtle ambient shadow).
3. **Ưu tiên dữ liệu thời gian thực (Telemetry-First):**
   - Các chỉ số đo độ ẩm đất, nhiệt độ, mực nước, trạng thái máy bơm phải được hiển thị to rõ, đi kèm đơn vị đo và trạng thái tươi mới (freshness).

---

## 2. Hệ Thống Màu Sắc (Color Tokens)

### 2.1 Bảng màu Semantic Tokens

```css
:root {
  /* ── 1. Brand & Primary (Nông nghiệp công nghệ) ── */
  --color-primary: #216348;            /* Màu chủ đạo: Nút chính, thương hiệu, trạng thái kích hoạt */
  --color-primary-hover: #1b523c;      /* Hover trạng thái chính */
  --color-primary-active: #154130;     /* Active/pressed */
  --color-primary-subtle: #e7f1e9;     /* Nền nhạt cho tag, pill, sidebar active item */
  --color-primary-border: #9addba;     /* Viền điểm nhấn cho thẻ active */

  /* ── 2. Water & Moisture Accent (Tài nguyên nước & Tưới tiêu) ── */
  --color-water: #106493;              /* Xanh nước: Độ ẩm đất, lưu lượng nước, máy bơm */
  --color-water-hover: #0c4d72;
  --color-water-subtle: #eff4ff;       /* Nền thẻ cảm biến nước */
  --color-water-border: #8acaff;

  /* ── 3. Warning & Alerts (Cảnh báo ngưỡng kỹ thuật) ── */
  --color-warning: #d97706;            /* Vàng hổ phách: Độ ẩm thấp, bồn nước sắp cạn, pin yếu */
  --color-warning-subtle: #fef3c7;
  --color-warning-border: #fcd34d;

  /* ── 4. Danger & Emergency (Sự cố & Dừng khẩn cấp E-Stop) ── */
  --color-danger: #dc2626;             /* Đỏ: Ngắt bơm khẩn cấp, thiết bị Offline, sự cố rò rỉ */
  --color-danger-hover: #b91c1c;
  --color-danger-subtle: #fee2e2;
  --color-danger-border: #fca5a5;

  /* ── 5. Neutral & Surfaces (Bề mặt & Chữ - WCAG AAA) ── */
  --color-canvas: #f8f9ff;             /* Nền ứng dụng chính */
  --color-surface: #ffffff;            /* Nền Card, Panel, Modal, Dropdown */
  --color-surface-hover: #f3f6fc;      /* Hover trên bảng hoặc danh sách */
  --color-ink: #121c2a;                /* Màu chữ tiêu đề & số đo chính */
  --color-ink-secondary: #27313f;      /* Chữ nội dung thường */
  --color-muted: #52615b;              /* Nhãn metadata, gợi ý, ghi chú */
  --color-line: #e0e7e3;               /* Đường kẻ viền phân cách kỹ thuật */
  --color-line-focus: #106493;         /* Vòng focus trợ năng cho bàn phím */
}
```

---

## 3. Typography & Quy Tắc Tabular Numbers

### 3.1 Cấu hình Font Family
Hệ thống sử dụng **Be Vietnam Pro** làm họ font duy nhất:
- `@fontsource/be-vietnam-pro` nạp các weights: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold).

### 3.2 Quy tắc Bắt buộc: Tabular Numbers (`tabular-nums`)
Mọi thẻ hiển thị chỉ số đo thời gian thực từ ESP32 (độ ẩm đất %, nhiệt độ °C, mực nước %, thời gian đếm ngược bơm) **bắt buộc áp dụng thuộc tính `font-variant-numeric: tabular-nums` (class `tabular-nums`)**.
> **Lý do kỹ thuật:** Tabular Numbers cố định chiều rộng của từng chữ số từ 0 đến 9, triệt tiêu hoàn toàn hiện tượng rung giật giao diện (layout shifting / jitter) khi dữ liệu MQTT / SignalR nhảy số liên tục.

### 3.3 Thang đo Typography
| Token | Font Size / Line Height | Weight | Sử dụng cho |
|---|---|---|---|
| `display-lg` | 32px / 40px | 700 (Bold) | Tiêu đề trang Welcome, số liệu nổi bật trang chủ |
| `headline-md` | 20px / 28px | 600 (SemiBold) | Tiêu đề Section, Card Header |
| `metric-xl` | 28px / 32px | 700 (Bold, `tabular-nums`) | Chỉ số đo lớn trong thẻ cảm biến |
| `metric-md` | 20px / 24px | 700 (Bold, `tabular-nums`) | Chỉ số phụ trong danh sách |
| `body-md` | 14px / 20px | 400 (Regular) | Nội dung văn bản thông thường, form input |
| `label-md` | 13px / 18px | 500 (Medium) | Nhãn trường nhập, nút bấm, menu item |
| `label-sm` | 11px / 16px | 600 (SemiBold, uppercase) | Eyebrow text, metadata, badge trạng thái |

---

## 4. Bán Kính Góc Bo (Border Radius) & Độ Nổi (Elevation & Depth)

### 4.1 Quy chuẩn Bo Góc
- **Cards & Panels chính:** `rounded-xl` (14px ~ `0.875rem`) — Tạo cảm giác hiện đại, gọn gàng.
- **Buttons, Inputs, Selects:** `rounded-lg` (8px ~ `0.5rem`) — Chắc chắn, phản hồi xúc giác dứt khoát.
- **Badges, Status Pills:** `rounded-full` (`9999px`) — Nhấn mạnh trạng thái tức thời.
- **Indicator Dots:** `rounded-full` hình tròn tuyệt đối (`aspect-square`).

### 4.2 Đổ bóng & Đường viền (Subtle Ambient Elevation)
- **Flat (Nền):** Không đổ bóng.
- **Card Mặc định:** Viền `1px solid var(--color-line)`, bóng siêu nhẹ `box-shadow: 0 1px 3px 0 rgba(31, 41, 55, 0.05)`.
- **Card Hover / Active:** Viền đổi sang `rgba(33, 99, 72, 0.3)`, bóng tăng nhẹ `box-shadow: 0 4px 6px -1px rgba(33, 99, 72, 0.08)`.
- **Modal / Dialog / Popover:** Viền `1px solid var(--color-line)`, bóng sâu `box-shadow: 0 10px 15px -3px rgba(18, 28, 42, 0.1)`.

---

## 5. Chuẩn Hóa Trạng Thái Tương Tác (Component States)

Mọi thành phần tương tác trong Design System phải hỗ trợ đầy đủ 6 trạng thái:
1. **Idle (Mặc định):** Rõ ràng, dễ nhận biết.
2. **Hover:** Tăng độ tương phản nhẹ, con trỏ `cursor-pointer`.
3. **Focus-visible:** Vòng viền trợ năng `outline: 3px solid #106493; outline-offset: 2px;` khi duyệt bằng phím Tab.
4. **Active (Pressed):** Thu nhỏ nhẹ `transform: scale(0.98)` hoặc sậm màu nền.
5. **Disabled:** Độ mờ `opacity: 0.5`, con trỏ `cursor-not-allowed`, vô hiệu hóa sự kiện click.
6. **Loading:** Spinner tròn hiển thị ngay trên nút hoặc Card chuyển sang trạng thái Skeleton shimmer.

---

## 6. Bộ Thành Phần Tái Sử Dụng Chuẩn (Core Reusable Components)

1. **Button:**
   - `primary`: Nền xanh đậm `#216348`, chữ trắng.
   - `secondary`: Nền xanh nhạt `#E7F1E9`, chữ xanh đậm.
   - `danger` (E-Stop): Nền đỏ `#DC2626`, chữ trắng.
   - `outline` / `ghost`: Viền mỏng hoặc trong suốt dùng cho hành động phụ.
2. **Input & Select:**
   - Chiều cao chuẩn 40px (Desktop) hoặc 44px (Mobile chạm ngón tay).
   - Có trạng thái hiển thị Icon đầu/cuối, nhãn Label bên trên, tin nhắn lỗi màu đỏ (`text-danger`) kèm `aria-invalid`.
3. **Badge & Status Pill:**
   - Kèm Icon hoặc Chấm tròn Indicator (`online`, `watering`, `warning`, `offline`).
4. **Card & Panel:**
   - Hỗ trợ slot `header`, `children`, `footer`.
5. **Modal & Dialog:**
   - Backdrop làm mờ `backdrop-blur-sm bg-ink/40`.
   - Phím `Esc` để đóng, focus trap an toàn.
6. **Skeleton Shimmer:**
   - Dùng hiệu ứng tải nhẹ cho thẻ cảm biến và bảng khi đang đợi phản hồi API.
7. **EmptyState:**
   - Khối thông báo sạch sẽ khi không có dữ liệu (kèm Icon, mô tả và nút thêm mới).

---

## 7. Responsive Breakpoints & Accessibility (A11y)

- **Mobile (`< 768px`):** Bố cục 1 cột, Header có hamburger mở Mobile Drawer, thanh điều hướng dưới hoặc drawer toàn màn hình.
- **Tablet (`768px – 1023px`):** Bố cục 2 cột, Sidebar dạng rút gọn hoặc Drawer.
- **Desktop (`>= 1024px`):** Sidebar 240px cố định (hỗ trợ thu gọn thành 72px icon-only), lưới 12 cột thông thoáng.
- **Tiếp cận WCAG 2.1 AA:**
  - Tỷ lệ tương phản màu chữ/nền $\ge 4.5:1$.
  - Hỗ trợ thẻ nhảy nhanh `.skip-link` ở đầu trang.
  - Đầy đủ nhãn `aria-label`, `role="alert"` cho thông báo lỗi.

