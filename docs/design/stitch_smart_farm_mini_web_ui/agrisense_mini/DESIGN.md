---
name: AgriSense Mini
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#404943'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#296a4e'
  primary: '#004b32'
  on-primary: '#ffffff'
  primary-container: '#216348'
  on-primary-container: '#9addba'
  inverse-primary: '#93d4b3'
  secondary: '#106493'
  on-secondary: '#ffffff'
  secondary-container: '#8acaff'
  on-secondary-container: '#005581'
  tertiary: '#653400'
  on-tertiary: '#ffffff'
  tertiary-container: '#874700'
  on-tertiary-container: '#ffc292'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#aef1ce'
  primary-fixed-dim: '#93d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#075138'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#90cdff'
  on-secondary-fixed: '#001e31'
  on-secondary-fixed-variant: '#004b72'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  metric-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  metric-md:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style
Hệ thống được thiết kế theo phong cách **Modern Technical Dashboard** kết hợp với **Eco-Minimalism**. Giao diện tập trung phục vụ các chủ vườn thông minh, kỹ sư nông nghiệp đô thị và người yêu công nghệ trồng cây tại gia.

Mục tiêu trải nghiệm là truyền tải sự chuẩn xác kỹ thuật, tính ổn định thời gian thực và sự an tâm tuyệt đối trong vận hành phần cứng (ESP32, cảm biến, máy bơm). Không gian sử dụng các bề mặt có cấu trúc rõ ràng, khoảng trắng thoáng đãng và giảm thiểu tối đa nhiễu hình ảnh để ưu tiên các số liệu đo lường tức thời (telemetry data).

## Colors
Bảng màu phản ánh tính chất nông nghiệp hiện đại hòa quyện cùng công nghệ điều khiển tự động:

- **Primary (`#216348`)**: Xanh lá đậm nông nghiệp công nghệ, thể hiện sự phát triển sinh thái, uy tín và chuẩn mực. Áp dụng cho các nút hành động chính, thanh trạng thái kích hoạt và điểm nhấn nhận diện thương hiệu.
- **Surface / Base (`#F7F9F5`)**: Trắng ngà tự nhiên làm nền chủ đạo, giảm chói mắt khi theo dõi màn hình ngoài trời hoặc thời gian dài.
- **Secondary Surface (`#E7F1E9`)**: Xanh nhạt dịu mát dùng cho thẻ trạng thái nổi bật, badge kích hoạt bơm và phân vùng logic.
- **Water / Moisture Accent (`#1E6B9B`, `#0284C7`)**: Xanh dương chuyên dụng cho độ ẩm đất, lưu lượng nước và trạng thái chu kỳ tưới tiêu.
- **Warning & Operational Alerts (`#D97706`, `#F59E0B`)**: Cảnh báo mực nước bồn thấp, nhiệt độ vượt ngưỡng nhẹ hoặc pin dự phòng yếu.
- **Danger & Emergency (`#DC2626`)**: Dùng cho hành động ngắt máy bơm khẩn cấp, cảm biến mất kết nối (Offline) và sự cố rò rỉ.
- **Text & Contrast (`#111827`, `#1F2937`, phụ: `#4B5563`)**: Đảm bảo chuẩn tiếp cận WCAG AAA trên nền sáng, giúp chỉ số dễ đọc dưới ánh sáng chói.
- **Border Neutral (`#E5E7EB`, `#D1D5DB`)**: Đường viền 1px phân định ranh giới giữa các khối dữ liệu kỹ thuật.

## Typography
Sử dụng **Be Vietnam Pro** làm họ font duy nhất cho toàn bộ hệ thống để đảm bảo tính bản địa hóa tiếng Việt hoàn hảo, dấu thanh rõ ràng và độ sắc nét cao trên màn hình độ phân giải di động lẫn máy trạm.

- **Tabular Numbers (`tnum`)**: Mọi thành phần hiển thị số đo telemetry (độ ẩm đất %, nhiệt độ °C, áp suất bar, thời gian đếm ngược tưới) bắt buộc áp dụng thuộc tính `font-variant-numeric: tabular-nums` nhằm giữ cố định chiều rộng chữ số, chống rung giật bố cục khi dữ liệu ESP32 bắn về liên tục qua WebSocket/MQTT.
- **Cấp bậc văn bản**:
  - `metric-xl` và `metric-md`: Dành riêng cho thẻ chỉ số IoT.
  - `label-sm`: Viết hoa nhẹ (uppercase với tracking +0.04em) cho metadata, nhãn gateway và trạng thái phần cứng.

## Layout & Spacing
Bố cục được xây dựng dựa trên lưới thích ứng 12 cột cho desktop và lưới 4 cột cho màn hình di động/tablet cầm tay:

- **Desktop & Màn hình điều hành (>= 1024px)**: Sử dụng cấu trúc chia khung với sidebar điều hướng cố định (260px) và canvas thẻ linh hoạt. Grid sử dụng rãnh (gutter) 24px để tạo khoảng cách thông thoáng giữa các cụm thiết bị ESP32.
- **Mobile (< 768px)**: Chuyển thành bố cục 1 cột cuộn dọc, lề (margin) 16px, tối ưu thao tác một tay cho các thao tác gạt van, kích hoạt máy bơm tại hiện trường vườn.
- **Rhythm quy chuẩn**: Mọi khoảng cách thành phần tuân theo đơn vị cơ sở 4px/8px, với `space-md` (14px) và `space-lg` (20px) là khoảng cách đệm nội bộ chuẩn trong các thẻ dashboard.

## Elevation & Depth
Hệ thống sử dụng kỹ thuật **Low-Contrast Outlines kết hợp Subtle Ambient Shadow** để nhấn mạnh độ chính xác, không dùng bóng đổ quá đậm tạo cảm giác nặng nề:

- **Surface Flat (Nền)**: `background-color: #F7F9F5` không có bóng.
- **Card Base**: Nền trắng nguyên chất (`#FFFFFF`), đường viền tinh tế `1px solid #E5E7EB`, bóng vi sai siêu mềm: `box-shadow: 0 1px 3px 0 rgba(31, 41, 55, 0.05), 0 1px 2px -1px rgba(31, 41, 55, 0.03)`.
- **Card Active / Interactive Hover**: Tăng nhẹ bóng và viền chuyển sang tông primary mờ: `border-color: rgba(33, 99, 72, 0.3)`, `box-shadow: 0 4px 6px -1px rgba(33, 99, 72, 0.08), 0 2px 4px -2px rgba(33, 99, 72, 0.04)`.
- **Lớp điều khiển ghi đè (Modal / Drawer)**: Nền `#FFFFFF`, viền mờ `#D1D5DB`, đổ bóng sâu hơn: `box-shadow: 0 10px 15px -3px rgba(17, 24, 39, 0.08), 0 4px 6px -4px rgba(17, 24, 39, 0.04)`.

## Shapes
Hệ thống quy định chuẩn bán kính góc cụ thể cho từng hạng mục để cân bằng giữa sự thân thiện của cây trồng tự nhiên và kỷ luật của máy móc công nghiệp:

- **Thẻ Card IoT chính**: Bo góc đúng **14px** (`border-radius: 14px` ~ 0.875rem), tạo cảm giác hiện đại, gọn gàng và đóng khung thông số đo mạch lạc.
- **Thành phần tương tác nhỏ (Buttons, Input, Select)**: Bo góc **8px** (0.5rem) để giữ tính phản hồi cứng cáp, dứt khoát.
- **Badges, Status Pills & Value Tags**: Bo tròn toàn phần (`rounded-full` / 9999px) nhằm nhấn mạnh tính trạng thái tức thời.
- **Sensor Indicator Dots**: Khối tròn tuyệt đối (`aspect-ratio: 1/1; border-radius: 50%`) kèm vòng sóng nhẹ cho hiệu ứng heartbeat.

## Components

### 1. Cards (Khối cảm biến & Thiết bị)
- Bo góc cố định 14px, nền trắng `#FFFFFF`, viền mảnh 1px `#E5E7EB`.
- Cấu trúc 3 tầng:
  1. *Header*: Tên khu vực/loại cảm biến, nhãn ESP32 ID (font label-sm, màu `#6B7280`) và Status Dot thời gian thực.
  2. *Metric Body*: Giá trị số lớn (metric-xl, `tabular-nums`), đơn vị đo gắn liền kế bên. Biểu đồ sparkline mini 24h đặt ẩn mờ bên dưới chỉ số.
  3. *Footer*: Thời gian cập nhật gần nhất (vd: "Vừa xong", "2s trước") kèm switch gạt tự động hoặc ngưỡng cảnh báo.

### 2. Realtime Connection & Status Indicator Dots
- Kích thước chấm: 8px × 8px (trực thuộc thẻ) hoặc 10px × 10px (trên thanh topbar điều hướng).
- Trạng thái:
  - **ESP32 Online / Active**: Chấm `#216348` kèm hiệu ứng ping viền mờ `rgba(33, 99, 72, 0.25)` chu kỳ 2s.
  - **Bơm đang tưới (Watering)**: Chấm xanh dương `#0284C7` kèm hiệu ứng sóng đôi.
  - **Cảnh báo ngưỡng**: Chấm `#F59E0B`.
  - **Mất tín hiệu (Offline / Error)**: Chấm đỏ `#DC2626` đứng yên, có viền 1px bao ngoài.

### 3. Nút bấm (Buttons)
- **Primary Action (Kích hoạt tưới, Lưu lịch trình)**: Nền `#216348`, chữ trắng `#FFFFFF`, chiều cao tối thiểu 40px, hover: `#1b523c`, focus-visible: viền offset 2px màu xanh `#216348`.
- **Secondary (Tùy chỉnh zone, Đổi chu kỳ)**: Nền `#E7F1E9`, chữ `#216348`, viền không màu, hover: `#d8e8dc`.
- **Emergency Stop (Ngắt khẩn cấp)**: Nền `#DC2626`, chữ trắng, trạng thái ấn xuống (active) lập tức chuyển đổi phản hồi cơ học rõ rệt.

### 4. Input Fields & Bộ cài đặt ngưỡng
- Chiều cao 40px, nền `#FFFFFF`, viền 1px `#D1D5DB`, góc bo 8px.
- Nhãn chỉ dẫn nằm trên trường nhập, độ tương phản chuẩn. Khi focus: viền chuyển sang `#216348` kèm vòng sáng mờ 3px `rgba(33, 99, 72, 0.15)`.

### 5. Chips, Badges & Toggles
- **Sensor Mode Chips**: Dùng kiểu Pill (bo tròn hoàn toàn), chiều cao 24px–28px. Nền xanh nhạt `#E7F1E9`, văn bản `#216348` đậm.
- **Relay Toggle Switch**: Nền xám `#E5E7EB` khi tắt, chuyển sang `#216348` (cho chế độ thông thường) hoặc `#0284C7` (cho van bơm) khi mở. Núm gạt tròn trắng có bóng nhẹ 1px.