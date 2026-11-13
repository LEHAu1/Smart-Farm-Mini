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
- **MQTT:** Gửi telemetry dạng JSON lên topic `smartfarm/device/{deviceCode}/telemetry`, nhận lệnh tại `smartfarm/device/{deviceCode}/command`, và phản hồi lệnh tại `smartfarm/device/{deviceCode}/ack`.

### Payload telemetry
Mỗi mẫu đo gửi thành một bản tin riêng, dùng QoS 1. `messageId` là GUID duy nhất cho từng mẫu đo để backend loại bản tin gửi lặp.

```json
{
  "messageId": "b25a3e9d-38f2-4ef9-9aa6-59e1df1fe647",
  "sensorType": "SoilMoisture",
  "value": 42.5,
  "unit": "%",
  "recordedAtUtc": "2026-11-13T08:30:00Z"
}
```

`sensorType` nhận một trong `SoilMoisture`, `AirTemperature`, `AirHumidity`, `WaterTemperature`, `WaterLevel`. `recordedAtUtc` có thể bỏ qua; nếu có, phải là thời gian UTC.

### Lệnh và phản hồi
Backend gửi lệnh QoS 1 lên topic `.../command`. Payload gồm `commandId`, `commandCode`, `action`, `payload`, `createdAtUtc`. `action` hiện hỗ trợ `START_PUMP`, `STOP_PUMP`, `PUMP_ON`, `PUMP_OFF`, `EMERGENCY_STOP`, `RESET_SYSTEM`. ESP32 chỉ thực thi lệnh trong allowlist và vẫn phải áp dụng kiểm tra an toàn tại biên trước khi bật relay.

Khi broker không xác nhận được kết quả publish, backend giữ trạng thái lệnh `Pending` và mặc định thử lại tối đa 5 lần cho mỗi process đang chạy, với backoff tăng dần. Số lần thử lại và thời hạn có thể cấu hình; giới hạn hiện tại là 1–20 lần thử lại và 1–1440 phút. Bộ đếm thử lại chỉ lưu trong RAM nên được đặt lại khi Web API khởi động lại; thời hạn mặc định 10 phút được tính từ `createdAtUtc` trong database và vẫn áp dụng qua lần khởi động lại. ESP32 phải lưu/khử lặp `commandId` ít nhất bằng thời hạn được cấu hình (mặc định 10 phút) để lệnh QoS 1 gửi lại không làm bơm chạy lặp. Hết cửa sổ thử lại, backend vẫn giữ `Pending` (không khẳng định lệnh thất bại); cần đối soát trạng thái thiết bị.

Sau khi nhận lệnh, ESP32 gửi trạng thái QoS 1 lên topic `.../ack`:

```json
{
  "commandId": "e1fb09ea-22b6-4cbe-adc5-340ba31fac92",
  "status": "Acknowledged"
}
```

Các trạng thái phản hồi là `Acknowledged`, `Completed` hoặc `Failed`; khi thất bại có thể thêm `errorMessage`. Dùng cùng `commandId` trong mọi phản hồi của lệnh đó.

### Xác thực broker
Backend chỉ bật MQTT khi `Mqtt:Enabled=true` và có username/password của broker. MQTT client này không thể xác thực danh tính publisher riêng từ nội dung bản tin; broker phải bật xác thực từng ESP32 và ACL theo topic: mỗi thiết bị chỉ publish telemetry/ack của chính nó và subscribe command của chính nó. Backend cần quyền subscribe wildcard telemetry/ack và publish command. Bật TLS trong môi trường triển khai. Các yêu cầu broker/ACL này phải được cấu hình và kiểm tra riêng; repo không chứa cấu hình broker.

Backend đọc cấu hình qua .NET configuration, ví dụ biến môi trường `Mqtt__Enabled=true`, `Mqtt__Host`, `Mqtt__Port`, `Mqtt__Username`, `Mqtt__Password`, `Mqtt__UseTls=true`. MQTT mặc định tắt; không đặt mật khẩu broker trong file được commit. Topic MQTT hiện là hợp đồng cố định trong code, không cấu hình pattern khác: telemetry `smartfarm/device/+/telemetry`, ACK `smartfarm/device/+/ack`, command `smartfarm/device/{deviceCode}/command`.

### Giới hạn triển khai nhiều instance
Hiện chỉ hỗ trợ một instance Web API. MQTT client mặc định dùng client ID `SmartFarm-WebAPI`; nhiều instance dùng chung ID có thể làm broker ngắt kết nối lẫn nhau. Bộ đếm retry và khóa đồng bộ ACK/trạng thái thiết bị cũng chỉ nằm trong RAM của process. Muốn chạy nhiều instance cần client ID riêng cho từng instance cùng cơ chế phối hợp dùng chung (ví dụ outbox/retry state và distributed lock); hiện chưa triển khai.

> README này mô tả hợp đồng backend mới. Firmware hiện chưa có mã nguồn trong repository, nên cần cập nhật và kiểm thử trên ESP32 trước khi dùng thật.

