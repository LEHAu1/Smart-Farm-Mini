# Smart Farm Mini — Firmware EMQX Readiness & Telemetry QA

**Ngày:** 25/11/2026  
**Branch:** `feature/iot-end-to-end-integration`  
**Phạm vi:** firmware build/configuration, telemetry tests, security review.  
**Giới hạn:** không flash, không publish MQTT, không khởi động actuator; không ghi `SmartFarmMiniDb`.

## Tóm tắt

- Firmware compile-only: **PASS**, được build agent và QA độc lập chạy lại.
- Backend telemetry reliability SQL tests: **4/4 PASS** sau khi QA phát hiện và sửa một assertion của test nhiều thiết bị.
- Backend handler unit tests liên quan: **4/4 PASS**.
- Dashboard realtime 28.2°C → 31.6°C không refresh và persistence sau refresh: **user-confirmed ở lượt trước**; lượt này không mở lại Browser MCP. Các reading 28.2/31.6 đã được QA xác minh trong DB E2E ở báo cáo trước.
- Duplicate, invalid humidity, out-of-order reading, device isolation và stale heartbeat được kiểm thử với LocalDB disposable. Wi-Fi/MQTT reconnect và broker-level retry/redelivery chưa được kiểm thử.
- Cấu hình mẫu đã dùng EMQX Cloud TLS/8883, xác thực CA fail-closed, đồng bộ UTC trước khi TLS. CA và thông tin đăng nhập riêng của ESP32 vẫn là placeholder; cấu hình local `config.h` chưa được chuyển sang cloud vì chưa xác minh CA/credential thiết bị.
- ACL EMQX theo từng thiết bị và quyền cấm Backend publish command: **NOT VERIFIED**.
- **Supervised telemetry-only hardware test: NO-GO hiện tại.** Chỉ xem xét sau khi cấu hình CA/credential thiết bị đúng deployment, xác minh ACL, và được phê duyệt riêng cho thao tác phần cứng.

## 1. Firmware cloud configuration

- `config.example.h` đặt host EMQX deployment, port `8883`, `MqttUseTls=true`, username/password riêng cho thiết bị dưới dạng placeholder.
- Root CA vẫn là placeholder. Firmware từ chối kết nối TLS khi chưa có CA hợp lệ; không hạ cấp sang plain MQTT. EMQX hướng dẫn tải CA của deployment từ trang Overview và dùng TLS port 8883 ([EMQX Cloud: kết nối deployment](https://docs.emqx.com/en/cloud/latest/connect_to_deployments/deploy_mqtt_broker.html)). Không nhúng CA đoán hoặc certificate không kiểm chứng.
- Code đồng bộ giờ bằng NTP; nếu epoch chưa đáng tin cậy, TLS MQTT bị chặn. NTP thử lại mỗi 60 giây sau lỗi.
- `DeviceCode` được kiểm tra cùng rule Backend: 1–50 ký tự ASCII `[A-Za-z0-9_-]`. Chỉ khoảng trắng đầu/cuối trong giá trị `DeviceCode` của `config.h` local đã được loại bỏ; script xác nhận giá trị đạt rule nhưng không xuất giá trị. Các trường config local khác được giữ nguyên.
- Topic/payload vẫn khớp Backend: `smartfarm/device/{DeviceCode}/telemetry`, `messageId` GUID, `sensorType`, `value`, `unit`, `recordedAtUtc` UTC tùy chọn; QoS 1.
- YL-69 vẫn chỉ log raw ADC, chưa publish độ ẩm đất; cần calibration trong đất trước khi báo phần trăm.
- Source không có lệnh ghi relay/pump. Nếu nhận command, firmware hiện kiểm tra hạn/dedup và chỉ trả `Failed`; không báo `Acknowledged`/`Completed`, không actuate. Backend command dispatch tiếp tục bị cấu hình tắt. Không có command được gửi trong lượt này.
- Cấu hình local `config.h` vẫn giữ broker/port/TLS/credential/CA hiện tại; chưa phải cấu hình cloud sẵn để chạy. Chỉ cập nhật local sau khi có CA tải từ đúng EMQX deployment và tài khoản thiết bị riêng.

## 2. Credential security và ACL

- `firmware/esp32-controller/telemetry/include/config.h` không được Git track; `.gitignore` tại `include/.gitignore` xác nhận ignore `/config.h`.
- Quét file tracked không tìm thấy mẫu private key, JWT key, AWS access key hoặc GitHub token. Cấu hình mẫu chỉ chứa placeholder; MQTT password backend nằm trong User Secrets theo hồ sơ trước, không được đọc/in ở lần kiểm tra này.
- Firmware image có thể trích xuất credential. Dùng một principal riêng cho mỗi thiết bị; không dùng lại `smartfarm_backend`.
- **Credential rotation checklist:**
  1. Xoay mật khẩu Wi-Fi và MQTT cho thiết bị vì nội dung cấu hình local từng xuất hiện trong output công cụ nội bộ ở lượt review trước; xoay cả Backend MQTT credential nếu đã dùng chung/tái sử dụng.
  2. Tạo MQTT username/password riêng cho từng ESP32; cấp ACL tối thiểu cho DeviceCode tương ứng.
  3. Tải CA deployment từ EMQX Console và đặt trong `config.h` local; không gửi credential/CA private material trong chat hoặc commit.
  4. Build local không bật verbose secret logging; giữ `config.h` ignored và bảo vệ `.bin` như artifact có credential.
  5. Sau khi xác nhận kết nối telemetry an toàn, thu hồi credential cũ.
- ACL hiện **NOT VERIFIED**. Chưa có export/read-only snapshot từ EMQX. SUBACK của Backend cho telemetry không chứng minh quyền ESP32 hoặc quyền cấm publish command. Không thử ACL bằng command PUBLISH.
- ACL mục tiêu cần kiểm tra trong EMQX Console: mỗi thiết bị chỉ publish vào topic telemetry của chính nó; nếu duy trì command-intake/ACK hiện có thì chỉ subscribe command và publish ACK của chính nó. Backend chỉ được quyền cần thiết cho telemetry/ACK; command publish phải bị broker từ chối theo policy. Xác minh bằng ACL export/simulator read-only, không dùng actuator topic probe.

## 3. Telemetry reliability tests

### Kết quả kiểm thử SQL disposable

QA độc lập chạy lại sau khi sửa assertion: **4/4 PASS**, 0 failed, exit 0. TRX: `.ai/firmware-readiness-qa-results/firmware-readiness-telemetry-sql-qa-rerun.trx`.

| Case | Kết quả | Cách kiểm tra |
|---|---|---|
| Duplicate MessageId + SensorType | **PASS** | Gọi handler hai lần với cùng payload/QoS 1 redelivery; SQL đếm đúng 1 `(MessageId, SensorType)`. Cùng MessageId nhưng SensorType khác được phép lưu theo unique key hiện tại. |
| AirHumidity = 120% | **PASS** | Gọi handler qua SensorService/repository thật; DB không có row của MessageId invalid. Handler unit test cũng xác nhận không broadcast sensor data. |
| Out-of-order timestamp | **PASS** | Repository thật trả reading mới nhất theo `RecordedAtUtc`, không thay bằng sample cũ. |
| Nhiều synthetic devices | **PASS** | Hai device trong DB disposable không lẫn kết quả; test gửi ID lặp trong danh sách query. |
| Stale heartbeat | **PASS** | Repository đánh dấu device cũ offline và giữ nguyên `LastSeenAtUtc`. |
| Wi-Fi reconnect | **NOT VERIFIED** | Không có Wi-Fi fake/hardware simulator trong lượt này. Chỉ source review retry timer. |
| MQTT reconnect | **NOT VERIFIED** | Không chạy broker/harness mạng; chỉ source review reconnect loop. |
| Retry/lost ACK và broker redelivery | **PARTIAL** | Handler duplicate delivery được mô phỏng bằng gọi lại cùng message và SQL uniqueness; không mô phỏng packet-level QoS, ACK loss, broker reconnect hoặc process crash. |

### E2E giao diện từ lượt trước

Người dùng xác nhận Dashboard cập nhật AirTemperature **28.2°C → 31.6°C không refresh** và giữ giá trị sau khi tải lại. QA/coordinator trước đó xác minh hai reading tương ứng đã lưu trong DB E2E. Đây là user-confirmed Browser E2E cộng với database persistence check; Browser MCP không được chạy lại trong lượt hiện tại vì frontend/backend E2E đang dừng. Các test SQL reliability mới xác minh duplicate/invalid/domain persistence độc lập qua handler và repository, không thay thế bài test trình duyệt/realtime.

Disposable test DBs được giữ lại, không xóa:

- QA SQL rerun: `SmartFarmLeaseIT_383d3b5e389e4822b715b7cbe94d0173` — ONLINE, retained.
- QA run trước khi sửa assertion: `SmartFarmLeaseIT_22c6929e07a24f83a396a671f5299233` — ONLINE, retained; kết quả ban đầu 3/4 PASS, 1 FAIL chỉ do assertion test dùng `Single()` trên hai row cùng device.
- Không DB test nào dùng `SmartFarmMiniDb`.

## 4. Backend heartbeat semantics

`MqttMessageHandler.HandleAsync` hiện đánh dấu device active là online và lưu `LastSeenAtUtc` khi nhận một packet trên topic telemetry/ack hợp lệ, trước khi parse và kiểm tra giá trị sensor. Do đó AirHumidity=120 bị từ chối và không tạo reading, nhưng packet từ identity/topic đã biết vẫn chứng minh MQTT traffic tới Backend.

Quy ước hiện được giữ: `IsOnline` biểu thị **có traffic kết nối gần đây**, không chứng minh cảm biến đang cho số hợp lệ. Test `InvalidAirHumidity_IsRejectedButStillRefreshesTransportHeartbeat` khóa hành vi này: online/LastSeen cập nhật; sensor reading và telemetry broadcast không xảy ra. QA chạy riêng nhóm `MqttMessageHandlerTests`: **4/4 PASS**.

Nếu UI cần trạng thái “thiết bị/cảm biến hoạt động tốt”, nên bổ sung chất lượng telemetry hoặc timestamp của reading hợp lệ riêng thay vì làm `IsOnline` vừa biểu thị transport vừa biểu thị độ hợp lệ dữ liệu. Không sửa business state trên DB thiết bị thật.

## 5. Build và QA độc lập

- PlatformIO compile-only: build agent PASS và QA độc lập rerun PASS; RAM 52,512/327,680 (16.0%), flash 919,853/1,310,720 (70.2%). Không upload/flash, không kết nối MQTT.
- `MqttMessageHandlerTests`: QA Windows host **4/4 PASS**.
- `MqttTelemetryReliabilitySqlIntegrationTests`: QA sau fix **4/4 PASS** trong DB unique disposable nêu trên.
- Một lần chạy VSTest trước đó timeout; sau đó focused tests chạy được. **Full backend suite chưa được chạy lại trong lượt này**, nên không tuyên bố toàn suite PASS.
- Host C++ protocol test `tests/command_protocol_tests.cpp`: **NOT RUN** vì môi trường không có `c++`, `g++`, `clang++` hoặc `cl`.
- QA xác nhận không thấy actuator output code, `config.h` ignored/untracked, DeviceCode validator khớp rule Backend, UTC gate trước TLS và placeholder CA fail-closed.
- Không kết nối broker, không publish command, không flash hay tác động thiết bị.

## 6. Source changes

- `firmware/esp32-controller/telemetry/src/main.cpp`: DeviceCode validator theo Backend, UTC gate trước TLS và NTP retry.
- `firmware/esp32-controller/telemetry/include/config.example.h`: host EMQX, TLS/8883, placeholder device credentials và CA deployment.
- `firmware/esp32-controller/telemetry/README.md`: hướng dẫn CA/DeviceCode/telemetry/actuator scope.
- `backend/SmartFarm.UnitTests/Services/MqttMessageHandlerTests.cs`: unit test xác nhận invalid value không tạo/broadcast reading nhưng cập nhật transport heartbeat.
- `backend/SmartFarm.UnitTests/Integration/MqttTelemetryReliabilitySqlIntegrationTests.cs`: SQL integration tests; assertion chọn reading mới nhất đã được sửa.
- `firmware/.../include/config.h` local ignored: chỉ trim whitespace quanh DeviceCode; broker/credential fields không thay đổi và không được ghi vào report.

Không commit, push hoặc merge. Các thay đổi chưa commit có sẵn trong worktree được giữ nguyên.

## 7. Remaining blockers và readiness verdict

### Supervised telemetry-only hardware testing

**NO-GO hiện tại.** Chưa có CA đúng deployment trong local config, device-specific cloud credentials chưa xác minh, local broker settings vẫn chưa chuyển sang EMQX, và ACL least privilege chưa được kiểm chứng. Firmware chỉ compile; chưa chạy thực tế với NTP/TLS/EMQX. Cần hoàn tất checklist credential/CA/ACL, xác nhận DeviceCode đã đăng ký, rồi xin phê duyệt riêng trước khi nối phần cứng thật. Không flash trong lượt này.

### Backend telemetry

**GO cho kiểm thử phần mềm synthetic/disposable**: reliability SQL tests 4/4 và handler unit tests 4/4 PASS. **Không tuyên bố live broker/browser E2E mới trong lượt này**; broker/browser không được mở lại. Giữ `Mqtt:CommandDispatchEnabled=false`.

### Physical control

**NO-GO.** Firmware không actuate; backend dispatch disabled; broker ACL chưa chứng minh cấm command publish. Không cấp quyền/lệnh actuator cho lần test telemetry này.
