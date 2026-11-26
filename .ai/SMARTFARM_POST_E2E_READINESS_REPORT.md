# Smart Farm Mini — Post E2E Readiness Report

**Ngày:** 25/11/2026  
**Branch:** `feature/iot-end-to-end-integration`  
**Database live:** `SmartFarmMiniDb` không được thay đổi.  
**MQTT/hardware:** Không publish command, không khởi động pump/relay, không flash ESP32.

## Tóm tắt

Người dùng xác nhận luồng MQTTX → EMQX → Backend → SQL và Dashboard realtime/persistence đã PASS, gồm hai giá trị 28.2°C → 31.6°C, thử trùng MessageId và payload AirHumidity 120%. Coordinator và QA độc lập xác nhận trong database E2E có đúng hai reading AirTemperature tương ứng 28.20°C và 31.60°C, mỗi reading một hàng; không tìm thấy reading AirHumidity giá trị 120. Tuy nhiên, không có MessageId của bài duplicate/invalid tương ứng với hai reading đã lưu, nên các ca đó chỉ được ghi nhận là user-confirmed, chưa được xác minh độc lập theo cùng MessageId. MessageId từ lần MQTTX trước đó (`a7e40f27-5d6a-4f00-a2f1-0fb68d35c88f`) không có hàng tương ứng.

Migration rehearsal đã hoàn tất trên database clone mới được restore: six-history adoption preflight PASS, migration lease thứ bảy PASS, 7/7 history records, không model drift, dữ liệu nghiệp vụ và năm lệnh cũ được giữ nguyên. QA độc lập xác nhận các hậu kiểm trên clone. `SmartFarmMiniDb` vẫn chưa được áp dụng bất kỳ thay đổi nào.

| Hạng mục | Verdict |
|---|---|
| Telemetry E2E theo xác nhận người dùng | **PASS (user-confirmed)** |
| Persistence của 28.2°C và 31.6°C | **PASS (được QA xác minh độc lập trên DB E2E)** |
| Duplicate cùng MessageId và invalid 120% | **PARTIAL / chưa xác minh độc lập theo MessageId** |
| Firmware compile-only | **PASS** |
| Firmware TLS thực tế tới EMQX | **NOT VERIFIED** |
| Migration rehearsal clone | **PASS (QA độc lập)** |
| Áp migration lên `SmartFarmMiniDb` | **NO-GO trong phạm vi này** |
| Physical pump/relay control | **NO-GO** |

## 1. Firmware build và contract

- Agent build độc lập chạy `platformio.exe run --project-dir firmware/esp32-controller/telemetry`: **PASS**, exit 0; RAM 52,512/327,680 (16.0%), flash 919,853/1,310,720 (70.2%). Đây là compile-only; không upload/flash và không kết nối mạng.
- Host-side `command_protocol_tests.cpp`: **NOT RUN**, môi trường không có `c++`, `g++`, `clang++` hoặc `cl`.
- Source dùng `WiFiClientSecure` và CA verification; từ chối CA placeholder khi TLS bật. `config.example.h` mặc định TLS/8883, nhưng cấu hình local hiện tắt TLS. Vì vậy firmware hiện dùng TLS tới EMQX **chưa được xác minh**.
- Telemetry topic trong firmware: `smartfarm/device/{DeviceCode}/telemetry`; payload có GUID `messageId`, `sensorType`, `value`, `unit`, timestamp UTC tùy chọn; QoS 1. Firmware hiện gửi AirTemperature, AirHumidity và WaterLevel; YL-69 chưa được publish.
- Firmware đóng gói credential vào image; xem credential là có thể trích xuất, dùng identity riêng với ACL giới hạn cho từng thiết bị. Local `DeviceCode` có vẻ chứa ký tự thừa/khoảng trắng nên có nguy cơ không khớp whitelist/topic; cần sửa cấu hình local rồi compile lại trước khi nạp.
- **Bảo mật cần xử lý:** trong lúc kiểm tra build, nội dung cấu hình local nhạy cảm đã xuất hiện trong output công cụ nội bộ. Báo cáo không chứa giá trị. Khuyến nghị thay credential Wi-Fi/MQTT liên quan, dùng credential riêng cho thiết bị, giữ file `config.h` ignored và không đưa nó vào Git/image artifact công khai.

## 2. Telemetry reliability

### E2E và database evidence

QA và coordinator chỉ truy vấn database disposable `SmartFarmMini_E2E_20261125_9C4A`:

| SensorReading | MessageId | Số hàng | Giá trị |
|---|---|---:|---:|
| AirTemperature | `C1A4BB2D-3141-43A0-A984-5C6F17D5A27B` | 1 | 28.20 °C |
| AirTemperature | `C11A8EC0-48C2-4D79-B8EE-36254F7A9012` | 1 | 31.60 °C |

- Hai giá trị khớp với kết quả Dashboard do người dùng xác nhận. Browser không được chạy lại độc lập trong lượt hiện tại: cổng 5173/5205 hiện không có listener, Browser MCP nhận connection refused khi mở Dashboard.
- Device test `FARM-E2E-25NOV26-9C4A`: hiện `IsOnline=0`, `LastSeenAtUtc=2026-11-25 08:39:50Z`; thời điểm này cũ hơn reading 31.6°C (14:30Z). Đây là snapshot sau khi E2E Backend đã dừng, không phủ định lần realtime trước đó; nhưng trạng thái online hiện thời không thể coi là đang sống.
- Pending commands trong DB E2E: 0.
- Không có hàng `AirHumidity=120`; do thiếu MessageId/lần chạy gắn với payload lỗi, chỉ xác nhận không lưu giá trị này trong snapshot, chưa chứng minh rejection path độc lập.
- Lượt MQTTX trước với MessageId `a7e40f27-5d6a-4f00-a2f1-0fb68d35c88f` không có hàng trong `SensorReadings`. Hai reading 28.2/31.6 dùng MessageId khác nhau; chúng không xác minh bài duplicate đã báo.

### Code/test coverage và giới hạn

| Scenario | Kết quả |
|---|---|
| Duplicate telemetry | Source có unique filtered index `(MessageId, SensorType)` và handler bỏ qua SQL duplicate key. Người dùng xác nhận E2E một hàng; QA chưa có MessageId cụ thể khớp dữ liệu hiện có để xác minh lại. Unit test chuyên biệt cho duplicate telemetry DB path còn thiếu. |
| Out-of-order timestamps | Source giữ `RecordedAtUtc` quá khứ; Dashboard truy vấn theo RecordedAtUtc. Chưa có test chuyên biệt được chạy trong lượt này. |
| Invalid telemetry / online state | Giá trị invalid không được lưu theo xác nhận và DB snapshot. Source hiện cập nhật online/LastSeen cho device active trước khi parse/range validation; payload lỗi vẫn có thể làm thiết bị hiển thị online. Đây là rủi ro semantics cần test/quyết định rõ. |
| Stale heartbeat | Có heartbeat timeout mặc định 90 giây; DB snapshot hiện offline. Chưa xác minh chuyển online→offline realtime bằng browser/MQTT trong lượt này. |
| Wi-Fi/MQTT reconnect, broker duplicate/lost ACK | Có retry loops trong firmware/backend nhưng chưa có fake/network simulator đủ để xác minh reconnect, replay, delayed ACK hay lost ACK. Firmware queue ở RAM; reboot mất queue và khi đầy sẽ loại telemetry cũ nhất. |
| Nhiều synthetic devices | Chưa kiểm thử message flow qua broker cho nhiều device đồng thời. |
| Backend unit tests | QA rerun bị VSTest testhost timeout ở 90 giây; TRX `.ai/phase2-qa-results/post-readiness-qa.trx` báo 0 tests executed. Baseline trước đó 177/177 PASS không thay thế được lần chạy hiện tại. |

## 3. EMQX Cloud security

- EMQX TLS/MQTT CONNECT và Backend telemetry SUBACK Granted QoS 1 đã PASS trong các lần harness trước được ghi ở `.ai/EMQX_BACKEND_INTEGRATION_REPORT.md` và `.ai/EMQX_TELEMETRY_E2E_REPORT.md`.
- `Mqtt:CommandDispatchEnabled=false` được cấu hình; hosted service, dispatcher và đường publish command có application guard. DB E2E có 0 pending command; không có command được phát trong lượt này.
- Broker-side ACL chưa được xác minh đầy đủ: chưa có export ACL; quyền subscribe của Backend không chứng minh quyền publish của ESP32; không có phép thử độc lập chứng minh Backend bị broker từ chối publish command. Không gửi command probe vì có side effect.
- ESP32 identity/ACL chưa được xác minh trên EMQX. Mục tiêu tối thiểu: từng thiết bị chỉ publish telemetry/ACK của chính nó và chỉ subscribe command của chính nó nếu chức năng được cho phép; Backend chỉ subscribe telemetry/ACK cần thiết. Physical firmware TLS hiện chưa bật/xác minh.
- **Verdict:** application-level command dispatch **PASS disabled**; least-privilege broker ACL **NOT VERIFIED**.

## 4. Database migration rehearsal

### Backup và clone

- Backup input: `.ai/SmartFarmMiniDb_Phase2_20261125.bak`, SHA-256 `15B4C8D02CBDB78ECA182BFDC2EE172DEBDA39732481EB624457253B33243276`.
- Backup header: nguồn `SmartFarmMiniDb`, backup hoàn tất `2026-11-25 10:21:15`; `RESTORE VERIFYONLY WITH CHECKSUM`: **PASS**. Đây là backup có sẵn đã xác minh, không phải backup mới tạo trong lượt hiện tại.
- Restore mới sang clone riêng: `SmartFarmMini_PostReadiness_20261125_7A2F`, server LocalDB `LAPTOP-UKV16E8V\LOCALDB#01127BD7`, trạng thái ONLINE; MDF/LDF riêng tại `C:\Users\Lenovo\SmartFarmMini_PostReadiness_20261125_7A2F.mdf` và `_log.ldf`. Tên database và file path được xác nhận chưa tồn tại trước restore.
- Không khởi chạy WebAPI/MQTT trên clone. Không kết nối broker. Không xóa clone.

### Sequence và hậu kiểm

1. Clone ban đầu: 13 bảng nghiệp vụ, chưa có `dbo.__EFMigrationsHistory`; fingerprint chuẩn hóa `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`; preflight adoption 6 migration **PASS**.
2. Derived adoption script chỉ khóa vào đúng tên clone và file path của clone; SHA-256 `1C6BBFB3848EB719EE57EA9ABF16DDDED9128F5FD57270224AA62DD4FF8E0BE2`. Chỉ ghi 6 history rows trên clone; source script production không sửa.
3. Áp migration thứ bảy `20261125012849_AddDeviceCommandDispatchLeases` bằng EF với connection chỉ định rõ tới clone: **PASS**, exit 0.
4. Hậu kiểm: đúng 7 migration records, `ProductVersion=10.0.13`; bốn cột `DispatchAttemptCount`, `DispatchLeaseOwnerId`, `DispatchLeaseUntilUtc`, `ExpiresAtUtc` tồn tại; index `IX_DevCmds_DispatchLease` enabled; 0 expiry mismatch; DBCC CHECKCONSTRAINTS không có lỗi.
5. EF migrations list: đủ 7/7 Applied; `has-pending-model-changes`: “No changes have been made to the model since the last migration.”
6. Counts trước/sau: Users 3, Devices 3, SensorReadings 7,827, DeviceCommands 5, RefreshTokens 26 — không đổi.
7. Cả 5 lệnh gốc vẫn `FARM-ESP32-001`, `START_PUMP`, `Status=1/Pending`, cùng IDs và CreatedAt; lease owner/until NULL, attempt count 0. Backfill đặt expiry = CreatedAtUtc + 10 phút, khiến cả năm lệnh nay đã expired nhưng trạng thái vẫn Pending. Dispatcher phải tiếp tục bị tắt cho đến khi có kế hoạch xử lý riêng; không dispatch trong rehearsal.
8. Hai QA agents độc lập read-only kiểm tra identity/MDF/LDF, 7 history rows, lease schema/index (gồm thứ tự key), counts, 5 command statuses/expiry và DBCC: **PASS**. QA thứ nhất cũng chạy `has-pending-model-changes` trên clone và xác nhận không drift; QA thứ hai đối chiếu kết quả đó với evidence hiện có mà không chạy migration.

Bằng chứng: `.ai/postreadiness-migration-preflight.txt`, `.ai/postreadiness-adoption-dryrun.txt`, `.ai/postreadiness-adoption-apply.sql`, `.ai/postreadiness-adoption-apply-result.txt`, `.ai/postreadiness-before-lease-update.txt`, `.ai/postreadiness-lease-update.log`, `.ai/postreadiness-postmigration.txt`.

### Production database verdict

Rehearsal clone **PASS**, nhưng `SmartFarmMiniDb` không thay đổi. Deployment lên DB thật **NO-GO** trong báo cáo này: cần cập nhật và QA lại deployment plan để biểu diễn đúng sequence 6-history adoption + migration 7/backfill; xác nhận backup/maintenance window mới; quyết định rõ xử lý năm lệnh Pending đã expired; và có lệnh phê duyệt thực thi riêng. Không dùng rehearsal PASS làm quyền ghi DB thật.

## 5. QA độc lập

- QA database clone: **PASS**; kiểm chứng trực tiếp clone và dữ liệu trước/sau như mục 4.
- QA telemetry database: **PARTIAL PASS**; xác nhận hai reading 28.2/31.6, không có AirHumidity=120, 0 PendingCommands; không xác minh được duplicate cùng MessageId cụ thể do ID user test không được cung cấp/khớp với lượt MQTTX cũ.
- QA local processes: không có listener cuối cùng trên 5173/5205; không thể lặp Browser E2E hiện thời.
- QA backend focused tests: **BLOCKED**, VSTest testhost timeout 90s; 0 tests executed trong TRX.
- QA không publish MQTT, không sửa database, không truy cập hardware.
- Firmware build độc lập **PASS** compile-only; host parser tests **NOT RUN** vì thiếu compiler.

## 6. Files và thay đổi

- Tạo báo cáo này: `.ai/SMARTFARM_POST_E2E_READINESS_REPORT.md`.
- Không chỉnh sửa source code trong lượt readiness này; giữ nguyên các thay đổi chưa commit có sẵn trong worktree.
- Tạo artifacts rehearsal `.ai/postreadiness-*`; không tạo commit/push/merge.
- Không ghi `SmartFarmMiniDb`, không đổi năm command trong DB thật, không tương tác broker/ESP32.

## 7. Remaining blockers và verdict cuối

### Telemetry

**CONDITIONAL GO cho telemetry-only trên thiết bị synthetic và DB disposable**, với `CommandDispatchEnabled=false`. User-confirmed E2E được hỗ trợ một phần bởi hai row persistence đã được QA kiểm tra. Chưa coi toàn bộ acceptance được independently verified: cần ID/evidence của duplicate và invalid test, packet-level PUBACK/log EMQX, live Browser MCP realtime/refresh, broker ACL least privilege và test reconnect/multiple devices. Backend/frontend hiện đã dừng.

### Physical control / command dispatch

**NO-GO.** Giữ command dispatch disabled. Firmware thực tế chưa được xác nhận; broker command ACL chưa xác minh; năm `START_PUMP` Pending trong backup/clone rehearsal trở thành expired theo migration backfill nhưng vẫn Pending. Trạng thái hiện tại của DB thật không được truy vấn trong lượt này. Không thử actuator. Cần xử lý an toàn các lệnh cũ, xác minh firmware TLS/identity/ACK/dedup, và broker ACL trước khi xem xét bất kỳ lệnh vật lý nào.

### Database

**Clone migration rehearsal GO; `SmartFarmMiniDb` deployment NO-GO.** Không áp dụng thay đổi thật trong lượt này.
