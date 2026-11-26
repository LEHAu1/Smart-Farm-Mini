# Báo cáo tích hợp Backend với EMQX Cloud

**Ngày:** 25/11/2026  
**Branch:** `feature/iot-end-to-end-integration`

## Kết luận

Backend đã có hỗ trợ MQTT TLS và Username/Password. Đã bổ sung chế độ telemetry-only fail-closed: command dispatch mặc định tắt và các đường dispatch/publish lệnh bị chặn khi cờ này tắt. Sau khi quyền Subscribe được cấp, harness độc lập CONNECT/Auth thành công và SUBACK cấp QoS 1 cho topic test.

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| MQTTX kết nối EMQX Cloud | **PASS (theo người dùng)** | MQTTX đã publish/subscribe `smartfarm/test/cloud-connectivity`; chưa được chạy lại độc lập trong lượt này. |
| TLS tới EMQX Cloud | **PASS** | TLS 1.3 handshake và xác minh chứng chỉ thành công; MQTT CONNECT qua TLS cũng thành công. |
| MQTT CONNECT (harness độc lập) | **PASS** | Harness nhận `MQTT_CONNECT_RESULT=Success`; dùng ClientId riêng. WebAPI không được khởi chạy. |
| Authentication (harness) | **PASS** | Broker trả CONNACK Success cho username `smartfarm_backend`; password không được in hoặc đưa vào report. |
| Subscription test-only | **PASS** | SUBACK `GrantedQoS1` cho `smartfarm/test/cloud-connectivity`. Lần kiểm tra trước ACL cập nhật trả `NotAuthorized`; lần chạy hiện tại đã được cấp quyền. |
| Telemetry ingestion qua Backend | **NOT RUN / BLOCKED** | Không gửi telemetry payload; harness chỉ kết nối và subscribe, không gọi WebAPI. |
| Database persistence | **NOT RUN / BLOCKED** | Không khởi động WebAPI, không kết nối DB và không ghi dữ liệu. |
| Telemetry-only command safety | **PASS (source + unit tests)** | Dispatch bị chặn trước khi đọc/claim command; publish command topic bị từ chối. Không có broker/actuator thật tham gia. |
| Build và unit tests | **PASS** | WebAPI build thành công; unit test 173 passed, 0 failed, 10 skipped có chủ đích. |
| Independent QA | **PASS cho CONNECT/SUBSCRIBE/SAFETY** | QA chạy harness độc lập với ClientId riêng: CONNECT/Auth PASS, SUBACK `GrantedQoS1`, disconnect thành công, publish count 0, database không dùng. |

## Thay đổi mã nguồn

- `MqttBrokerSettings` có `CommandDispatchEnabled` mặc định `false`, cùng filter cấu hình riêng cho telemetry và acknowledgement.
- `DependencyInjection` bind các cài đặt mới từ cấu hình `Mqtt`.
- `PendingCommandDispatcher` thoát ngay khi dispatch bị tắt, trước khi đọc hoặc claim command.
- `MqttHostedService` không dispatch sau connect hoặc trong vòng reconnect khi cờ tắt.
- `MqttClientService` dùng topic filters cấu hình được và từ chối publish command topic khi dispatch bị tắt. TLS dùng `UseTls()` và xác thực broker bằng username/password.
- Tests bao phủ cấu hình, credentials thiếu, chặn START_PUMP/direct command publish và không query/claim/publish trong telemetry-only.
- `appsettings.Development.json` hiện chứa host `w9d01192.ala.asia-southeast1.emqxsl.com`, port `8883`, TLS bật, username `smartfarm_backend`, `Enabled=true`, `CommandDispatchEnabled=false`, telemetry filter test-only và ACK filter rỗng; không chứa password.
- User Secrets cho WebAPI cũng được xác nhận có password và cấu hình hiệu lực tương ứng. Các khóa không bí mật được đặt/chuẩn hóa cho phiên thử; password được giữ nguyên. Chỉ kiểm tra sự hiện diện, không đọc/in giá trị.

## Cấu hình chạy an toàn

User Secrets đã được đặt cho phiên kiểm tra topic `smartfarm/test/cloud-connectivity`; password không đưa vào source/report:

```text
Mqtt:Enabled=true
Mqtt:Host=w9d01192.ala.asia-southeast1.emqxsl.com
Mqtt:Port=8883
Mqtt:UseTls=true
Mqtt:Username=smartfarm_backend
Mqtt:Password=<đặt cục bộ, không gửi trong chat>
Mqtt:CommandDispatchEnabled=false
Mqtt:TelemetryTopicFilter=smartfarm/test/cloud-connectivity
Mqtt:AcknowledgementTopicFilter=
```

Topic test không phải telemetry contract thiết bị; handler không xem payload tùy ý trên topic này là telemetry hợp lệ. Kết nối test-only không chứng minh ingestion/persistence. Muốn kiểm tra lưu dữ liệu cần database disposable và topic/payload hợp lệ.

## Kiểm thử

1. `dotnet build backend/SmartFarm.WebAPI/SmartFarm.WebAPI.csproj --no-restore --disable-build-servers` — **PASS**, 0 warning, 0 error.
2. `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore --disable-build-servers -m:1 --logger "trx;LogFileName=emqx-backend-telemetry-only-final.trx" --results-directory .ai/emqx-test-results` — **PASS**, 173 passed, 0 failed, 10 skipped (SQL opt-in tests).
3. TRX: `.ai/emqx-test-results/emqx-backend-telemetry-only-final.trx`.
4. TLS handshake — **PASS**, TLS 1.3, xác minh chứng chỉ thành công.
5. Harness MQTTnet cô lập (không khởi động WebAPI/DbContext): preflight PASS; CONNECT result `Success`; authentication PASS; SUBACK `GrantedQoS1`; DISCONNECT PASS; `PUBLISH_COUNT=0`; `DATABASE=NOT_USED`.
6. QA độc lập chạy lại harness riêng và xác nhận cùng kết quả: CONNECT/Auth PASS, SUBACK `GrantedQoS1`, không publish và không dùng DB.
7. `git diff --check` — không có lỗi whitespace; Git cảnh báo chuẩn hóa LF/CRLF ở một số file.

Harness thực hiện chính: `.ai/emqx-subscription-harness/Program.cs`. QA dùng harness riêng để đối chiếu độc lập.

## An toàn và giới hạn

- Không khởi động WebAPI, không truy cập/thay đổi `SmartFarmMiniDb`.
- Harness xác thực MQTT và thử subscribe đúng topic test-only; không publish bất kỳ payload nào và không gửi command.
- Không bật relay/bơm và không flash ESP32.
- Không chạy telemetry E2E hoặc kiểm thử database persistence.
- `appsettings.Development.json` và User Secrets hiện bật MQTT. **Không khởi chạy WebAPI** vì cấu hình ứng dụng vẫn có thể mở kết nối tới `SmartFarmMiniDb`; chỉ harness độc lập được dùng và harness không tạo DbContext.
- CONNECT/Auth thành công chứng minh broker chấp nhận credentials hiện tại; SUBACK `GrantedQoS1` chứng minh quyền subscribe topic test. Hai kết quả này không chứng minh ingestion/persistence.

## QA độc lập

**Code/config review: PASS.** QA xác nhận `CommandDispatchEnabled=false`; hosted service gate sau connect/reconnect và retry tick; dispatcher thoát trước repository calls; publish topic command chuẩn bị chặn ở `MqttClientService`; không tìm thấy đường publish command khác. QA xác nhận các cài đặt hiệu lực và không in password.

**Independent MQTT verification:** TLS/CONNECT/Auth/SUBSCRIBE PASS; SUBACK `GrantedQoS1`; disconnect PASS; không publish, không dùng database. Kết quả trước đó `NotAuthorized` đã được khắc phục sau khi cập nhật quyền Subscribe; lần chạy hiện tại dùng ClientId duy nhất và username `smartfarm_backend`.

**Build/test evidence:** WebAPI build và 173 unit tests đã PASS ở lần kiểm thử trước trong thread. Independent QA build PASS; lượt VSTest độc lập trước đó bị BLOCKED do testhost timeout. Chưa có test trực tiếp chạy `MqttHostedService` qua reconnect/tick.

## Bước tiếp theo

Subscription trên topic test hiện đã hoạt động với QoS 1. Muốn kiểm chứng ingestion/persistence vẫn cần một telemetry payload theo contract hợp lệ và database disposable; CONNECT/Auth/SUBSCRIBE thành công chưa đủ để đánh dấu các mục đó PASS. Giữ dispatch tắt.

**Git:** không commit, push hoặc merge. Các thay đổi trước đó trong working tree được giữ nguyên.
