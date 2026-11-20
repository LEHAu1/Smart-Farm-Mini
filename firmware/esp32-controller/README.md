# Smart Farm Mini — ESP32 Controller Firmware

Mã nguồn nhúng (Firmware) chạy trên vi điều khiển ESP32 trung tâm để điều khiển toàn bộ cảm biến và cơ cấu chấp hành.

## 1. Phần cứng
- **Thiết kế mục tiêu:** ESP32 DevKit V1, cảm biến đất điện dung, DHT22, DS18B20, phao, OLED và relay/bơm.
- **Bản demo theo sơ đồ lắp hiện tại:** ESP32 DevKit V1, module YL-38 + đầu dò YL-69 (loại điện trở), DHT11, công tắc phao 2 dây, relay 5V và bơm 5V. Sơ đồ chưa có DS18B20 hoặc OLED; DHT11 và YL-69 khác với cấu hình mục tiêu.

### Pin mapping theo sơ đồ demo

| Tín hiệu | ESP32 | Ghi chú |
|---|---:|---|
| YL-38 AO | GPIO34 | Đọc ADC; cấp module 3.3V; chỉ hiệu chuẩn sau khi đo raw ở đất khô/ướt |
| DHT11 DATA | GPIO4 | Module 3 chân, nguồn 3.3V |
| Một dây phao | GPIO27 | Dây còn lại GND; `INPUT_PULLUP` đọc tiếp điểm đóng/mở. Bản kiểm tra hiện ánh xạ tiếp điểm mở thành `waterPresent=true` theo phản hồi phao đang đảo giá trị; cần đổi `FloatClosedMeansWaterPresent` nếu thử thực tế cho kết quả ngược |
| Relay IN | GPIO26 | Người dùng báo relay gắn trên module có mã SRD-05VDC-SL-C; người dùng xác nhận phần cứng chạy ổn định, nhưng chế độ kích HIGH/LOW của board driver chưa được ghi nhận |
| Nguồn | 5V adapter → VIN/5V, relay VCC/COM, bơm | Sơ đồ ghi adapter ≥2A; mô tả sản phẩm bơm ghi 200mA (chưa đo thực tế/dòng khởi động-stall); chưa đo sụt áp |

GPIO34 là ngõ vào-only và không có pull-up/pull-down nội, phù hợp để đọc AO nhưng không dùng cho phao cần kéo mức. Xem [Espressif GPIO reference](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html).

> SRD-05VDC-SL-C là mã relay cơ/coil 5V; mã linh kiện này không xác định mạch driver trên board nhận mức HIGH hay LOW. Tài liệu relay ghi coil high-sensitivity 5V khoảng 71.4mA và định mức tải cảm ứng Form C tối đa 3A tại 28VDC; không suy ra từ đó cực tính IN hoặc dòng khởi động bơm. Xem [datasheet SRD](https://msako.jp/res/SRD-05VDC-SL-C.pdf). Diode 1N4007 trong sơ đồ có dòng chỉnh lưu trung bình tối đa 1A theo điều kiện datasheet; cần so với dòng khởi động/stall thực tế của bơm ([Vishay 1N4007](https://www.vishay.com/docs/88503/1n4001.pdf)).
>
> Trước khi nạp/chạy thử: tháo tải bơm khỏi tiếp điểm relay cho tới khi xác nhận relay kích HIGH/LOW và dòng bơm. Không cấp USB và adapter ngoài vào board cùng lúc nếu chưa xác minh đúng phiên bản DevKit; Espressif mô tả các ngõ USB, 5V và 3V3 là các lựa chọn nguồn loại trừ nhau trên DevKitC V4 ([nguồn](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html)).

## 2. Kiểm tra cảm biến đã đấu dây

`hardware-check/SmartFarmHardwareCheck.ino` là sketch chẩn đoán đọc YL-38 AO, trạng thái tiếp điểm phao, ánh xạ mức nước và DHT11 qua Serial Monitor 115200 baud. `floatContactClosed` giữ nguyên trạng thái điện; `waterPresent` dùng cực tính có thể cấu hình bằng `FloatClosedMeansWaterPresent` (mặc định `false` theo phản hồi phao đang đảo giá trị). Sketch không cấu hình GPIO26, không đóng relay, không chạy bơm và không gửi MQTT. Nó in ADC thô thay vì phần trăm độ ẩm vì YL-69 cần hiệu chuẩn theo đất/đầu dò thực tế.

### Firmware telemetry MQTT

Project PlatformIO tại `telemetry/` gửi DHT11 thành `AirTemperature`/`AirHumidity` và phao thành `WaterLevel` nhị phân 0/100 qua MQTT QoS 1. Sao chép `telemetry/include/config.example.h` thành `config.h` trong cùng thư mục (file này được Git bỏ qua), nhập Wi-Fi, device code đã đăng ký, thông tin broker theo từng thiết bị và CA broker, rồi build từ thư mục `telemetry/` bằng `pio run`. TLS bật mặc định và kết nối bị từ chối nếu CA còn placeholder. Sketch chưa gửi YL-69 vì chưa có hiệu chuẩn trong đất; cũng không có subscribe lệnh, ACK hay điều khiển relay/bơm. Môi trường hiện tại chưa có PlatformIO nên source chưa được biên dịch.

Người dùng đã báo kiểm thử phần cứng thực tế và chạy ổn định, đồng thời cung cấp serial JSON từ ESP32. DHT11 đọc khoảng 22.5–23.1°C và 76.3–78.9% RH; trạng thái tiếp điểm phao thay đổi. Khi nhúng trực tiếp đầu dò YL-69 vào nước, `soilAdcRaw` chuyển từ 4095 qua khoảng 2736–2885 rồi xuống 1298–1459 (4 mẫu cuối trung bình khoảng 1409). Số đo cho thấy ADC có phản ứng, nhưng nhúng nước không thay thế hiệu chuẩn trong đất; cần lấy mốc đất khô và đất ẩm/bão hòa với cùng loại đất và độ sâu cắm đầu dò. Đây là kết quả người dùng báo cáo, chưa được lặp lại trong workspace này.

> YL-69 là đầu dò điện trở: nên hạn chế thời gian cấp điện khi đo để giảm điện hóa/ăn mòn điện cực. Nghiên cứu đánh giá YL-69 khuyến nghị hiệu chuẩn theo loại đất và lưu ý ảnh hưởng của ion/độ mặn ([nghiên cứu](https://pmc.ncbi.nlm.nih.gov/articles/PMC7014303/)); phương pháp chỉ cấp điện trong thời gian đo giúp giảm suy giảm điện cực ở cảm biến điện trở ([Campbell Scientific CR6 manual](https://s.campbellsci.com/documents/br/manuals/cr6.pdf)).

## 3. An toàn tại biên (Edge Safety)
ESP32 tự bảo vệ độc lập:
- Tự ngắt bơm ngay lập tức nếu phao báo cạn nước.
- Tự ngắt bơm nếu nhiệt độ nước quá cao hoặc bơm chạy quá thời gian tối đa (Watchdog timeout).

## 4. Giao thức
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

> Firmware telemetry hiện có là bản gửi cảm biến qua MQTT, chưa triển khai điều khiển bơm, watchdog hoặc các yêu cầu fail-safe. Người dùng báo phần cứng đã chạy ổn định, nhưng phạm vi kiểm thử relay/bơm và phép đo dòng chưa được ghi lại. Chưa biên dịch/nạp firmware telemetry từ workspace này.

