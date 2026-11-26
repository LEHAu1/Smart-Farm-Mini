# Smart Farm Mini — ESP32 Backend E2E Readiness

**Ngày:** 26/11/2026 (Asia/Ho_Chi_Minh)  
**Branch:** `feature/iot-end-to-end-integration`  
**Mục tiêu:** bootstrap Backend riêng cho E2E, đăng ký `FARM-ESP32-001` qua API, sau đó xác minh kết nối EMQX theo chế độ telemetry-only.

**Cập nhật chẩn đoán Stage 3:** đã sửa parser User Secrets giữ khoảng trắng định dạng sau dấu `=`. Sau sửa, MQTTnet nhận `CONNACK=Success`, SUBACK đúng topic là `GrantedQoS1`, và Backend Stage 3 báo Ready. Không cần đổi password hoặc ACL EMQX.

## Kết luận

**Backend E2E readiness PASS.** Stage 1 và Stage 2 hoàn tất; thiết bị active, unique trong database disposable. Stage 3 kết nối EMQX và được cấp SUBACK trên đúng telemetry topic. Đây là xác nhận readiness; chưa khẳng định telemetry cảm biến vật lý đã được ingest.

Không có MQTT command được publish, command dispatch luôn tắt, không flash ESP32, và không truy cập `SmartFarmMiniDb`.

## Kết quả theo giai đoạn

| Giai đoạn / kiểm tra | Trạng thái | Bằng chứng |
|---|---|---|
| Firmware DeviceCode/TLS/TelemetryOnly preflight | **PASS** | Launcher xác nhận DeviceCode `FARM-ESP32-001`, EMQX host, TLS, cổng 8883, CA hiện diện và `TelemetryOnly=true`; không in cấu hình bí mật. |
| Dedicated Backend MQTT User Secret | **PASS** | Launcher đọc `Mqtt:BackendE2E:Password` trong bộ nhớ và xác nhận có giá trị; password không được ghi ra output/log. |
| Database identity/isolation | **PASS** | `DB_NAME()` trả `SmartFarmMini_E2E_20261125_9C4A`; mọi connection string tiến trình được ghim vào DB này. `SmartFarmMiniDb` không được truy vấn. |
| Stage 1 — Bootstrap API | **PASS** | Launcher xác nhận API chạy với DB Ready, MQTT Disabled, `CommandDispatchEnabled=false`, `telemetryReady=false`. Bootstrap không phụ thuộc thiết bị đã đăng ký. |
| Stage 2 — Register qua API | **PASS** | Tài khoản E2E được tạo riêng trong phiên chạy; thiết bị được tạo bằng `POST /api/Devices`, không có thao tác insert SQL. Launcher xác nhận phản hồi API rồi đọc lại DB. |
| Device persistence, active và unique | **PASS** | Truy vấn chỉ đọc vào DB E2E trả đúng một hàng `FARM-ESP32-001`, `IsActive=1`; `CodeCount=1`. Synthetic `FARM-E2E-25NOV26-9C4A` vẫn tồn tại active, `CodeCount=1`. |
| Secret source → runtime mapping | **PASS** | Đọc `Mqtt:BackendE2E:Password` trong bộ nhớ; xác nhận giá trị được gán bằng process env `Mqtt__Password` (boolean equality, không hiển thị giá trị). |
| DNS EMQX | **PASS** | Host phân giải thành `13.215.235.56` và `13.251.19.66`. |
| TCP 8883 | **PASS** | Kết nối TCP tới EMQX trên cổng 8883 thành công. |
| TLS handshake | **PASS** | .NET `SslStream` xác thực chứng thư theo hostname thành công; TLS 1.3, subject `CN=*.ala.asia-southeast1.emqxsl.com`. |
| MQTTnet harness CONNECT | **PASS** | Sau sửa parser, MQTTnet trả `CONNACK=Success` với username `smartfarm_backend`. Harness không truy cập DB, không khởi động WebAPI và không publish. |
| MQTT SUBACK | **PASS** | SUBACK cho `smartfarm/device/FARM-ESP32-001/telemetry` là `GrantedQoS1`. |
| Stage 3 — Operational API process | **PASS — process started** | Process khởi chạy trên `127.0.0.1:5206` với exact E2E DB, EMQX TLS/8883, `smartfarm_backend`, command dispatch false và ACK filter disabled. |
| Backend MQTT CONNECT | **PASS** | Stage 3 sau preflight DB E2E + dispatch=false báo `database=Ready`, `mqttBroker=Connected`. |
| Telemetry SUBACK đúng filter | **PASS** | Backend health báo `GrantedQoS1` cho exact filter `smartfarm/device/FARM-ESP32-001/telemetry`. |
| Runtime xác nhận không truy vấn/claim command | **PASS — source/config** | Environment override đặt dispatch false; `MqttHostedService` chỉ gọi dispatcher khi flag true. Không có command query/claim/publish trong bootstrap hoặc phép thử này. |
| Bí mật trong log | **PASS** | Harness và health chỉ xuất trạng thái; không in giá trị secret hoặc connection string. |
| ESP32 / actuator | **NOT RUN** | Không flash, không publish command và không điều khiển phần cứng. |

## Cấu hình runtime đã áp dụng

- DB: `SmartFarmMini_E2E_20261125_9C4A` (LocalDB); không dùng cấu hình Development mặc định.
- MQTT: `w9d01192.ala.asia-southeast1.emqxsl.com:8883`, TLS bật.
- Username: `smartfarm_backend`; password lấy riêng từ User Secrets key `Mqtt:BackendE2E:Password`.
- Telemetry filter: `smartfarm/device/FARM-ESP32-001/telemetry`.
- ACK filter: tắt trong phiên kiểm tra.
- `CommandDispatchEnabled=false` cho cả bootstrap lẫn operational process.
- Bootstrap API: cổng 5206, MQTT disabled. Operational Backend đã chạy qua health PASS tại `http://127.0.0.1:5206`; QA độc lập cũng nhận HTTP 200. Kiểm tra cuối lượt thấy cổng 5206 đã free, nên không còn E2E process chạy nền.

## Thay đổi source và launcher

- `.ai/Start_ESP32_Backend_E2E.ps1`: launcher hai giai đoạn (bootstrap, API registration, operational), pin DB E2E, đọc secret chỉ trong bộ nhớ, kiểm tra effective health, dừng khi readiness thất bại và không in credential.
- `.ai/.emqx-canonical-sub-harness/Program.cs`: MQTTnet harness đọc process environment, kiểm tra preconditions, CONNECT và SUBSCRIBE đúng telemetry topic; không có publish path.
- `HealthController.cs`: readiness hiện báo DB name, MQTT status, topic/subscription, dispatch flag, ACK subscription, và device active/telemetry readiness mà không trả connection string hay secret.
- `MqttBrokerSettings.cs` và DI: thêm cấu hình DeviceCode phục vụ readiness.
- `MqttClientService.cs`: kiểm tra SUBACK từng filter và chỉ coi GrantedQoS0/1 là subscription thành công; trạng thái bị xóa khi disconnect.
- `Program.cs`: loại bỏ route health bị khai báo trùng; dùng route trong `HealthController`.
- Web API build sau thay đổi: **PASS**, 0 warning, 0 error (`dotnet build ... --no-restore`).

Các file khác đã có thay đổi trong working tree từ công việc trước; không được gộp hoặc hoàn nguyên trong nhiệm vụ này.

## Root cause và cách sửa

Đã tách riêng các lớp kết nối:

1. DNS phân giải thành công.
2. TCP tới cổng 8883 mở.
3. TLS handshake 1.3 thành công và chứng thư khớp hostname.
4. .NET CLI trình bày User Secrets theo dạng `key = value`. Parser cũ trim key nhưng không trim khoảng trắng định dạng ở đầu value, vì vậy đã gán password kèm dấu cách vào `Mqtt__Password`.
5. Lần probe đó nhận `CONNACK=BadUserNameOrPassword`. Đây là lỗi parser của lần kiểm tra, không phải password lưu trong User Secrets bị EMQX từ chối.
6. Đã sửa parser trong `.ai/Start_ESP32_Backend_E2E.ps1` để xử lý whitespace quanh dấu `=` và trim value. Sau sửa, harness nhận `CONNACK=Success`, `SUBACK=GrantedQoS1`; Stage 3 health cũng đạt.

**Root cause:** whitespace định dạng của lệnh `dotnet user-secrets list` bị giữ lại khi launcher/harness phân tích password.

**Hướng sửa đã áp dụng:** parse bằng regex `^\s*([^=]+?)\s*=\s*(.*)$`, trim key/value, sau đó ánh xạ secret sang environment variable `Mqtt__Password`. Secret vẫn chỉ nằm trong bộ nhớ; không đổi credential hoặc ACL cloud.

## Independent QA

QA độc lập đã review source và rerun launcher. QA không đọc/ghi trực tiếp database, không publish MQTT và không gửi command:

- Stage 1 source flow, pin DB E2E, MQTT tắt, health bootstrap và telemetryReady false: **PASS — source review**.
- Stage 2 gọi API để đăng ký rồi kiểm tra active: **PASS — source review**; runtime PASS được xác nhận riêng bằng lần chạy thực tế và SQL read-only ở trên.
- Stage 3 topic filter, kiểm tra SUBACK GrantedQoS0/1, dispatch guard và command publish guard: **PASS — source review**.
- PowerShell launcher parse: **PASS**.
- Rerun Stage 1: **PASS** — bootstrap process chạy với MQTT disabled. Device đã tồn tại nên launcher bỏ qua đăng ký lặp.
- MQTTnet CONNECT/SUBSCRIBE độc lập: **PASS** — QA xác nhận DNS/TCP/TLS pass, `CONNACK=Success`, exact-topic `SUBACK=GrantedQoS1`, exit 0, publish count 0; không dùng DB/Backend/hardware.
- Independent QA GET `/health/ready` sau parser fix: **PASS**, HTTP 200; status Ready, đúng DB E2E, MQTT Connected, TLS/8883, username match, dispatch false, topic đúng, SUBACK GrantedQoS1, ACK subscription disabled, device active, telemetryReady true. Không SQL trực tiếp, publish hay restart.
- Independent QA build: **NOT RUN**. Web API build của orchestrator: **PASS**, 0 warning, 0 error.

QA độc lập xác nhận CONNECT/SUBACK và health runtime sau sửa; Stage 3 readiness **PASS**.

## Hành động tiếp theo

1. Backend hiện sẵn sàng nhận telemetry trên topic đã cấu hình.
2. Một phiên kiểm thử ingestion cảm biến thực tế là bước tiếp theo riêng; báo cáo này chưa xác minh telemetry mới từ ESP32.

## An toàn và trạng thái cuối

- Database mục tiêu E2E được giữ nguyên sau đăng ký API; chỉ thêm test account/device qua API.
- Database thật `SmartFarmMiniDb` không bị truy vấn hoặc thay đổi.
- Năm lệnh legacy `START_PUMP` không bị đọc/ghi/dispatch trong lượt này.
- Không publish MQTT message hoặc command; không tương tác phần cứng.
- Không commit, push hoặc merge.

**Verdict:** Stage 1 **PASS** · Stage 2 **PASS** · DNS/TCP/TLS **PASS** · MQTT CONNECT **PASS** · SUBACK **PASS (`GrantedQoS1`)** · Stage 3 **PASS — Backend readiness**. Backend đã dừng tại thời điểm kết thúc lượt kiểm tra. Telemetry ingestion thực tế từ cảm biến chưa được kiểm thử trong lượt này.
