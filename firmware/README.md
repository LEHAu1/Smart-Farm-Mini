# Smart Farm Mini — Firmware

Thư mục chứa mã nguồn nhúng (Firmware) chạy trên vi điều khiển ESP32 cho hệ thống Smart Farm Mini.

## 1. Phần cứng hỗ trợ
- **Vi điều khiển:** ESP32 DevKit V1 (ESP-WROOM-32)
- **Cảm biến độ ẩm đất:** Capacitive Soil Moisture Sensor v1.2 (analog)
- **Cảm biến môi trường:** DHT22 (Nhiệt độ & Độ ẩm không khí)
- **Cảm biến nhiệt độ nước:** DS18B20 chống nước (giao tiếp OneWire)
- **Cảm biến mực nước:** Float Switch (phát hiện cạn nước)
- **Hiển thị tại chỗ:** OLED 0.96 inch I2C (SSD1306)
- **Cơ cấu chấp hành:** Relay 5V kích hoạt máy bơm mini 5V/12V

## 2. Cơ chế an toàn tại biên (Edge Safety)
ESP32 tự bảo vệ và kiểm tra điều kiện an toàn độc lập với Backend:
- Không bao giờ kích hoạt bơm nếu bình cạn nước (Float Switch báo Open).
- Ngắt bơm khẩn cấp nếu nhiệt độ nước vượt ngưỡng an toàn.
- Giới hạn thời gian bơm tối đa (Watchdog / Timeout) để tránh ngập úng hoặc cháy bơm.

## 3. Giao thức truyền thông
- **Giao thức:** MQTT (truyền nhận dữ liệu qua broker trung gian).
- **Format dữ liệu:** JSON.
- **Topics:**
  - Telemetry: `smartfarm/device/{deviceCode}/telemetry`
  - Command: `smartfarm/device/{deviceCode}/command`
  - Status/LWT: `smartfarm/device/{deviceCode}/status`

