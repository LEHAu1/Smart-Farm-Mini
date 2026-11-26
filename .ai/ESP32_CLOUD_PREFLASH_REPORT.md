# Smart Farm Mini — ESP32 Cloud Pre-flash Verification

**Ngày:** 25/11/2026 (Asia/Ho_Chi_Minh)  
**Branch:** `feature/iot-end-to-end-integration`  
**Phạm vi:** kiểm tra cấu hình, build và source trước khi xem xét flash telemetry-only. Không flash, không kết nối broker, không publish MQTT, không khởi động Backend, không truy cập/ghi `SmartFarmMiniDb`, không điều khiển thiết bị.

## Tóm tắt quyết định

**NO-GO cho flash hoặc phiên thử telemetry-only có giám sát.** Build thành công, nhưng cấu hình local chưa xác nhận EMQX TLS/8883/CA; tài khoản và ACL của ESP32 chưa được xác minh; Backend chưa có cấu hình E2E đang hoạt động. Firmware vẫn subscribe topic command và gửi ACK, nên cần xác định rõ phạm vi telemetry-only và ACL trước khi cho phép thiết bị kết nối.

Không có thao tác flash sau báo cáo này, kể cả khi các blocker được xử lý sau đó.

## 1. Firmware Build

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| PlatformIO build firmware | **PASS** | Build agent compile-only thành công, exit 0. |
| Independent QA build | **PASS** | QA chạy lại compile-only cho `esp32dev`, exit 0; RAM 52,512/327,680 bytes, Flash 919,945/1,310,720 bytes. Không upload/flash. |
| Warnings/errors | **PASS** | Hai lượt build kết thúc thành công; QA không báo lỗi build. |
| Hardware runtime | **NOT RUN** | Không flash và không kết nối thiết bị. |

## 2. TLS, CA và thời gian UTC

Kiểm tra `config.h` local theo cách chỉ xuất các cờ boolean, không đọc/in giá trị cấu hình:

| Hạng mục | Kết quả |
|---|---|
| Host khớp EMQX deployment đã yêu cầu | **FAIL** |
| Port là 8883 | **FAIL** |
| TLS bật | **FAIL** |
| CA nhúng là PEM hợp lệ, không phải placeholder | **FAIL** |
| UTC/NTP gate trong source | **PASS — source inspection** |
| TLS certificate validation fail-closed | **PASS — source inspection** |

Source gọi `setCACert`, chặn TLS khi CA chưa hợp lệ hoặc UTC chưa đồng bộ, và thử NTP lại. Independent QA kiểm tra thấy file CA trong repository parse được theo kiểm tra của agent, nhưng file đó **không được nối vào cấu hình local hiệu lực**. Vì vậy không thể xem việc có file CA trong repo là bằng chứng thiết bị sẽ xác thực đúng broker. Không có TLS handshake thực hiện trong lượt này.

## 3. Device Identity và MQTT credentials

- `DeviceCode` local hiện diện và vượt qua kiểm tra định dạng đã sanitize theo rule Backend `[A-Za-z0-9_-]{1,50}`; giá trị không được ghi vào báo cáo.
- Firmware source dùng `DeviceCode` làm MQTT client ID và dựng topic telemetry/command/ACK theo mã thiết bị.
- Username local có cấu hình và không bằng username Backend `smartfarm_backend`; điều này **không chứng minh** tài khoản đã tồn tại trên EMQX hoặc là tài khoản riêng được cấp cho đúng thiết bị.
- Sự tồn tại/tính riêng biệt của MQTT account ESP32: **NOT VERIFIED**. Không truy vấn được EMQX account inventory theo quyền read-only trong lượt này.
- `config.h` không được Git track theo `.gitignore`; không có secret nào được in hoặc đưa vào báo cáo.

## 4. MQTT ACL

**NOT VERIFIED — blocker bắt buộc.** Không có ACL export/snapshot read-only để chứng minh:

1. Principal ESP32 chỉ được publish vào `smartfarm/device/{DeviceCode}/telemetry` của chính nó.
2. Principal ESP32 không được publish bất kỳ command topic nào.
3. Quyền subscribe command và publish ACK (nếu còn bật) chỉ giới hạn cho đúng thiết bị.

SUBACK lịch sử của Backend trên topic test không chứng minh quyền của principal ESP32. Không thực hiện probe publish/subscribe để suy đoán ACL. Trước phiên telemetry-only, cần cung cấp/kiểm tra ACL từ EMQX Console hoặc export được cấp quyền chỉ đọc.

## 5. Telemetry Contract và Backend compatibility

**Source contract: PASS, runtime E2E: NOT VERIFIED.** Firmware và Backend source cùng dùng topic `smartfarm/device/{DeviceCode}/telemetry`, `messageId` dạng GUID, enum `sensorType`, `value`, `unit`, thời gian UTC tùy chọn và QoS 1. DeviceCode validator phù hợp rule nêu trên.

Giới hạn đã phát hiện: Backend xác thực `unit` không rỗng nhưng không ép đơn vị cụ thể theo từng `SensorType`; vì thế source-level contract không bảo đảm mọi đơn vị sai sẽ bị Backend từ chối. Không có message nào được gửi trong lượt này.

Backend Development config có `Mqtt:CommandDispatchEnabled=false`, nhưng:

- Backend hiện không lắng nghe cổng 5205.
- Không tìm thấy cấu hình E2E riêng đang hoạt động.
- Development connection string mặc định **không trỏ database E2E**; do đó Backend không được khởi động và không kết nối database nào trong lượt này.
- Development telemetry filter đang là topic test `smartfarm/test/cloud-connectivity`, không phải wildcard/topic của thiết bị.
- Giá trị `CommandDispatchEnabled=false` được xác nhận từ file cấu hình source, chưa xác nhận là effective runtime config của một tiến trình đang chạy.

Không dùng `SmartFarmMiniDb`.

## 6. Actuator Safety và reconnect

- **Actuator execution: PASS theo source inspection.** QA không tìm thấy API xuất tín hiệu GPIO/PWM/relay trong telemetry firmware; các GPIO liên quan là input. Firmware từ chối lệnh với ACK `Failed`, không thực thi pump/relay.
- **Command subscription vẫn tồn tại.** Firmware subscribe `smartfarm/device/{DeviceCode}/command` sau khi kết nối, và có thể publish ACK lên topic thiết bị. Điều này không kích hoạt actuator theo source hiện tại, nhưng chưa phải cấu hình MQTT telemetry-only tuyệt đối. Cần ACL deny phù hợp hoặc một chế độ firmware không subscribe command trước khi xem xét pre-flash GO.
- **Reconnect: PASS theo source inspection, runtime NOT RUN.** Source có vòng thử lại Wi-Fi/MQTT và NTP; TLS bị chặn khi UTC chưa sẵn sàng. Không kiểm thử ngắt mạng hoặc reconnect qua broker thật/harness trong nhiệm vụ này.

## 7. Independent QA

Independent QA tự build compile-only và review source/config:

- Build: **PASS**, không upload/flash.
- TLS/CA local hiệu lực: **NO-GO**; CA trong repo chưa nối vào `config.h`.
- Device account/ACL: **NOT VERIFIED**.
- Actuator output: không thấy trong firmware source; command nhận vào chỉ bị từ chối.
- Command topic subscription: vẫn tồn tại; phải được xử lý trong chế độ telemetry-only/ACL.
- Backend: dispatch false trong Development config, nhưng không có E2E runtime config; không khởi động Backend.
- Kết luận độc lập: **NO-GO**.

QA không kết nối EMQX, không truy vấn database, không publish MQTT và không tác động phần cứng.

## 8. Điều kiện cần để xét lại GO

1. Cấu hình local cho đúng host deployment, port 8883 và TLS bật.
2. Lấy CA từ đúng deployment EMQX, xác minh chain/hostname/validity, đưa vào config local được ignore; build lại.
3. Xác minh principal MQTT riêng cho ESP32 tồn tại mà không dùng tài khoản Backend.
4. Xác minh ACL read-only cho chính xác DeviceCode: publish telemetry được phép; publish command bị từ chối; command subscription/ACK chỉ giữ nếu được chủ động phê duyệt cho chế độ này.
5. Chuẩn bị Backend E2E cấu hình riêng, database disposable, MQTT telemetry filter phù hợp và dispatch tắt; xác minh effective config trước khi chạy. Không dùng cấu hình Development mặc định hiện tại.
6. Independent QA kiểm tra lại sau các thay đổi. Chỉ sau đó mới xem xét phê duyệt riêng cho việc flash/phiên thử có giám sát; báo cáo này không cấp quyền flash.

## Bằng chứng và giới hạn

- Báo cáo nền đã đọc: `.ai/FIRMWARE_EMQX_READINESS_REPORT.md`.
- Kiểm tra cấu hình local chỉ ghi nhận boolean/pass-fail; không lưu giá trị host, DeviceCode, username, password, CA hay Wi-Fi.
- Hai lần build compile-only thành công; không upload.
- Chưa có bằng chứng runtime cho TLS handshake, MQTT CONNECT, ACL, publish telemetry từ ESP32, Backend ingestion hoặc phần cứng thực.
- Không sửa source/cấu hình firmware hoặc Backend trong nhiệm vụ này. Các thay đổi chưa commit khác trong worktree được giữ nguyên.
