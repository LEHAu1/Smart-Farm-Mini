# MQTT Dispatcher Integration Test Report

**Dự án:** Smart Farm Mini
**Branch:** feature/iot-end-to-end-integration
**Ngày:** 25-11-2026
**Phạm vi:** Kiểm tra dispatcher bằng mocks/fake publisher và review source. Không truy cập SmartFarmMiniDb, không khởi động broker/backend, không kết nối ESP32, không flash firmware.

## 1. Tóm tắt

Dispatcher đã được tách khỏi MqttHostedService để kiểm thử trực tiếp. Bản sửa kiểm tra expiry trước khi kiểm tra online, yêu cầu thiết bị active và có LastSeenAtUtc còn mới, đồng thời tuần tự hóa các lượt quét trong cùng một instance WebAPI. Thời gian được lấy lại cho từng command để expiry phát sinh giữa một lần scan không lọt qua kiểm tra.

Kết quả coordinator: **14/14 unit tests PASS** (7 test dispatcher mới + 7 test command/ACK hiện có). Tất cả dùng mocks/fake publisher, không dùng DB hoặc MQTT.

QA độc lập hoàn thành review source, nhưng lượt test độc lập đầu tiên bị VSTest/testhost treo trước khi trả kết quả; verdict QA hiện là **NOT VERIFIED**. Do đó acceptance criterion yêu cầu QA chạy lại chưa đạt.

**Khuyến nghị:** **NO-GO cho khởi động lại Backend/MQTT kết nối broker thật và chưa cho phép điều khiển phần cứng.** Lý do chính là duplicate publish giữa API trực tiếp và dispatcher/nhiều tiến trình chưa được loại trừ, firmware thực tế chưa xác minh idempotency/TTL, và firmware hiện trong repository không nhận command.

## 2. Thay đổi source

1. backend/SmartFarm.WebAPI/BackgroundServices/PendingCommandDispatcher.cs — dispatcher singleton mới:
   - Dùng TimeProvider để test thời gian xác định.
   - Tính expiry từ CreatedAtUtc, kiểm tra expiry trước online eligibility.
   - Lấy thời gian hiện tại riêng cho từng command.
   - Bỏ qua thiết bị inactive/offline, thiếu LastSeenAtUtc, heartbeat cũ hơn DeviceOfflineAfterSeconds hoặc timestamp ở tương lai.
   - SemaphoreSlim tuần tự hóa scan trong cùng một tiến trình.
   - Giữ command hết hạn ở Pending vì publish trước đó có thể đã được broker/thiết bị nhận nhưng ACK ứng dụng bị mất.

2. backend/SmartFarm.WebAPI/BackgroundServices/MqttHostedService.cs — gọi dispatcher singleton sau khi MQTT kết nối và ở mỗi retry tick; logic connect/reconnect hiện tại giữ nguyên.

3. backend/SmartFarm.WebAPI/Program.cs — đăng ký TimeProvider.System và PendingCommandDispatcher singleton.

4. backend/SmartFarm.UnitTests/Services/MqttPendingCommandDispatcherTests.cs — 7 test dùng IDeviceService/IDeviceCommandService mocks, fake publisher và MutableTimeProvider.

Không thay đổi database, migration, enum trạng thái, năm lệnh thật hoặc firmware.

## 3. Test scenarios

| Scenario | Kết quả test | Điều đã xác minh |
|---|---|---|
| Thiết bị offline | PASS | Publisher giả không nhận lệnh; trạng thái command vẫn Pending. |
| IsOnline=true nhưng LastSeenAtUtc stale | PASS | Dispatcher không publish dựa trên online flag cũ. |
| Thiết bị active/online với heartbeat mới | PASS | Một lệnh hợp lệ được publish một lần ở tick đầu tiên. |
| Lệnh hết hạn khi thiết bị offline, rồi thiết bị reconnect | PASS | Không publish trước/sau reconnect; Pending và ACK/completion/error fields giữ nguyên. |
| Nhiều tick trước retry deadline | PASS | Không publish lại trước lịch; có một retry khi đến deadline. |
| Hai scan đồng thời trên cùng dispatcher singleton | PASS | Fake publisher chỉ ghi nhận một publish trong cùng tiến trình. |
| Lệnh hết hạn trong lúc scan trước đó publish lệnh khác | PASS | Clock giả tiến quá expiry; command kế tiếp không được publish. |

Đây là dispatcher-level test harness với publisher giả, không phải kiểm thử MQTTnet/broker hoặc chạy MqttHostedService loop qua network.

## 4. Test commands và kết quả

Agent triển khai chạy test mới:

dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore --filter FullyQualifiedName~MqttPendingCommandDispatcherTests

Kết quả: **7 passed, 0 failed, 0 skipped**.

Coordinator chạy gộp dispatcher và các regression tests command/ACK:

dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore --filter "FullyQualifiedName~MqttPendingCommandDispatcherTests|FullyQualifiedName~DeviceCommandDispatchTests|FullyQualifiedName~MqttMessageHandlerTests"

Kết quả: **14 passed, 0 failed, 0 skipped**; thời lượng 475 ms. Build các project test liên quan thành công trong cùng lệnh.

Backend Agent cũng báo WebAPI build riêng thành công: 0 warnings, 0 errors.

### Independent QA

QA đọc độc lập source/test và xác nhận test harness không gọi DB, broker hoặc thiết bị. QA đã thử hai lần chạy test độc lập; cả lệnh --no-build và lần retry với --disable-build-servers -m:1 đều build/nhận diện assembly nhưng VSTest/testhost treo trước khi liệt kê hoặc chạy test. QA dừng mỗi lượt sau hơn 60 giây. Vì vậy QA test verdict là **NOT VERIFIED**, không được tính PASS. Coordinator đã có lần chạy test gộp thành công nêu trên; lần đó không thay thế yêu cầu chạy thành công từ QA độc lập.

## 5. Duplicate dispatch và các giới hạn chưa giải quyết

SemaphoreSlim chỉ bảo vệ các lần dispatcher scan dùng chung singleton trong **một tiến trình**. Nó không khóa các replica WebAPI khác nhau và không bao gồm đường publish tức thời trong DeviceCommandService.CreateCommandAsync.

Backend vẫn dùng QoS 1 và khi kết quả publish không rõ có thể gửi lại cùng commandId. Đây là at-least-once delivery, không phải exactly-once actuation. commandId cho phép firmware khử lặp, nhưng firmware telemetry trong repository không subscribe topic command, không xử lý commandId, không gửi application ACK, không có TTL command và không điều khiển relay/bơm. Ảnh firmware thực sự đang nạp trên ESP32 chưa được kiểm tra.

Không có DB outbox/claim/lease bền vững giữa nhiều tiến trình. Xây dựng cơ chế đó có thể cần schema/migration riêng; không làm trong task này để giữ nguyên kế hoạch migration hiện tại.

## 6. Trạng thái acceptance

| # | Acceptance criterion | Trạng thái | Ghi chú |
|---:|---|---|---|
| 1 | Expired commands are never published | PASS trong dispatcher test | Expiry được kiểm tra từng command; giữ Pending không đồng nghĩa publish. |
| 2 | Offline devices never receive queued commands | PASS trong dispatcher test | Kiểm tra cả IsOnline=false và heartbeat stale/future. |
| 3 | Reconnect does not replay expired commands | PASS ở dispatcher behavior | Test gọi lại cùng dispatcher sau khi thiết bị reconnect; không chạy MQTT reconnect loop thật. |
| 4 | Duplicate dispatch prevented or handled safely | PARTIAL / NOT ACCEPTED end-to-end | Concurrent scans trong một process được serialize; API publish race, multi-process và firmware dedupe chưa được giải quyết/xác minh. |
| 5 | Command expiry independently verified | PASS ở test harness | Fake clock kiểm tra expiry và expiry giữa scan. |
| 6 | QA reruns all relevant tests | NOT VERIFIED | Hai lượt QA bị testhost treo; kết quả 14/14 là lượt coordinator. |
| 7 | No live MQTT or hardware interaction | PASS | Không tạo kết nối hoặc gửi lệnh. |

## 7. Năm lệnh Pending và DB thật

Không truy vấn hoặc thay đổi SmartFarmMiniDb trong task này. Theo bằng chứng read-only từ báo cáo trước, database có năm START_PUMP Pending cho FARM-ESP32-001; thiết bị lúc đó offline và các lệnh quá hạn theo giới hạn hiện tại. Các unit tests mới dùng object in-memory, không chứa hoặc mutate bản sao của năm record thật.

Dispatcher vẫn để lệnh hết hạn ở Pending vì không thể kết luận lệnh chưa từng tới thiết bị khi ACK bị mất. Không đổi Failed/Expired tùy tiện để tránh báo sai trạng thái thực thi. Muốn ghi trạng thái Expired có audit cần thiết kế nghiệp vụ/schema và phê duyệt/migration riêng.

## 8. Kế hoạch an toàn và phê duyệt còn cần

- Không bật Backend/MQTT nối broker thật cho đến khi QA độc lập chạy test thành công.
- Không cho phép actuator control trước khi xác minh firmware đã nạp có command allowlist, commandId dedupe, TTL, ACK và fail-safe; hiện trạng đó chưa được xác minh.
- Trước khi xử lý duplicate end-to-end, cần chọn giải pháp durable dispatch claim/outbox phù hợp multi-instance và đồng bộ với migration plan; firmware phải idempotent theo commandId.
- Có thể tiếp tục kiểm thử code bằng fake publisher; mọi lần dùng broker thật hoặc phần cứng cần phê duyệt riêng.
- Không thao tác lên năm commands Pending; không chạy migration; không commit/push/merge.

**Kết luận triển khai:** các test dispatcher của coordinator PASS, nhưng các điều kiện an toàn end-to-end và QA độc lập chưa đạt. **Không khuyến nghị khởi động lại MQTT/backend để điều khiển thiết bị ở thời điểm này.**
