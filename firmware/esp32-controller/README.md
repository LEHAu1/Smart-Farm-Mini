# Smart Farm Mini — ESP32 Controller Firmware

Mã nguồn nhúng (Firmware) chạy trên vi điều khiển ESP32 trung tâm để điều khiển toàn bộ cảm biến và cơ cấu chấp hành.

## 1. Phần cứng
- **ESP32 DevKit V1** (ESP-WROOM-32)
- **Cảm biến độ ẩm đất:** Capacitive Soil Moisture Sensor v1.2 (Analog)
- **Cảm biến không khí:** DHT22 (Nhiệt độ & Độ ẩm không khí)
- **Cảm biến nước:** DS18B20 chống nước (OneWire)
- **Cảm biến mực nước:** Float Switch (Công tắc phao chống cạn)
- **Màn hình tại chỗ:** OLED 0.96 inch I2C (SSD1306)
- **Relay & Bơm:** Relay 5V điều khiển máy bơm mini

## 2. An toàn tại biên (Edge Safety)
ESP32 tự bảo vệ độc lập:
- Tự ngắt bơm ngay lập tức nếu phao báo cạn nước.
- Tự ngắt bơm nếu nhiệt độ nước quá cao hoặc bơm chạy quá thời gian tối đa (Watchdog timeout).

## 3. Giao thức
- **MQTT:** Gửi telemetry dạng JSON lên topic `smartfarm/device/{deviceCode}/telemetry` và nhận lệnh từ `smartfarm/device/{deviceCode}/command`.

