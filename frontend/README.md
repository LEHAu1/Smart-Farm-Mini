# Smart Farm Mini — Frontend

Thư mục chứa mã nguồn giao diện người dùng (Dashboard) của hệ thống Smart Farm Mini.

## 1. Công nghệ sử dụng
- **Framework:** React 19 / TypeScript
- **Styling:** Tailwind CSS
- **Build tool:** Vite
- **Real-time communication:** `@microsoft/signalr`
- **Charts:** Chart.js / Recharts

## 2. Tính năng chính dự kiến
- Giám sát thông số cảm biến thời gian thực (độ ẩm đất, nhiệt độ, độ ẩm không khí, nhiệt độ nước, mực nước).
- Điều khiển bật / tắt máy bơm thủ công.
- Cấu hình ngưỡng tưới tự động (Irrigation Rules).
- Hiển thị danh sách cảnh báo (Alerts) và lịch sử tưới (Irrigation Logs).
- Báo cáo và biểu đồ lịch sử dữ liệu cảm biến.

## 3. Cấu trúc dự kiến
```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

