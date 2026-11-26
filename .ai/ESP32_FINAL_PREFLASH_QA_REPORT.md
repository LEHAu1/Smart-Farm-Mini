# Smart Farm Mini — Final ESP32 Telemetry-Only Pre-Flash QA

**Ngày:** 26/11/2026 (Asia/Ho_Chi_Minh)
**Branch:** `feature/iot-end-to-end-integration`
**Phạm vi:** xác minh cấu hình/build firmware telemetry-only, Backend E2E và các giới hạn trước phiên flash có giám sát. Không flash trong lượt này.

## Kết luận

**GO cho một phiên flash telemetry-only có giám sát**, với điều kiện giữ Backend E2E ở cấu hình hiện tại: `CommandDispatchEnabled=false`, chỉ subscribe đúng telemetry topic, không bật command topic và không thay đổi EMQX ACL. Đây là quyết định cho thử nghiệm giám sát, không phải xác nhận firmware đã chạy trên ESP32 hay dữ liệu cảm biến đã được ingest.

Các điều kiện cốt lõi đã có bằng chứng: build dùng `config.h` cục bộ bị Git ignore; build PlatformIO pass; CA trong config xác thực được TLS chain của EMQX; `TelemetryOnly=true`; Backend readiness và SUBACK đúng topic pass; không có command/actuator path trong chế độ này. ACL publish của principal ESP32 dựa trên cấu hình do người dùng xác nhận, chưa được đọc trực tiếp từ EMQX trong lượt này.

## Bảng kết quả

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| Branch và DeviceCode | **PASS** | Branch `feature/iot-end-to-end-integration`; DeviceCode `FARM-ESP32-001`. |
| Build dùng real ignored `config.h` | **PASS** | `include/config.h` tồn tại và `git check-ignore` xác nhận bị ignore. `main.cpp` ưu tiên `config.h` qua `__has_include`; PlatformIO dependency file tham chiếu `include/config.h`. Không dùng `config.example.h` khi file thật hiện diện. |
| PlatformIO firmware build | **PASS** | Orchestrator và QA độc lập đều build `esp32dev` thành công; exit 0. RAM 47,088 / 327,680 bytes; Flash 913,801 / 1,310,720 bytes. Không upload. |
| Broker/port/TLS | **PASS** | Config hiệu lực trỏ tới EMQX host đã chỉ định, port 8883, TLS bật. TLS 1.3 handshake và hostname validation thành công. |
| CA firmware | **PASS** | PEM trong `config.h` parse được. Subject là DigiCert Global Root G2; custom-root validation với chính CA này chấp nhận chain của `*.ala.asia-southeast1.emqxsl.com`. QA độc lập xác nhận TLS-only handshake; CA còn hạn đến 2038-01-15. |
| Device MQTT identity | **PASS — config review** | Username `smartfarm_esp32_001` là tài khoản thiết bị, khác `smartfarm_backend`; DeviceCode khớp topic và Backend. Không in password. |
| TelemetryOnly | **PASS — source + build** | `TelemetryOnly=true`. Không đăng ký command callback, không subscribe command, command handler thoát ngay, ACK publish bị chặn, command NVS ledger không khởi tạo. Không có relay/pump output trong firmware. Sensor sampling và telemetry publish vẫn hoạt động. |
| Telemetry topic/payload contract | **PASS — source review** | Topic `smartfarm/device/FARM-ESP32-001/telemetry`. JSON gồm GUID `messageId`, `sensorType`, numeric `value`, `unit`, `recordedAtUtc` UTC ISO khi đồng hồ đã đồng bộ. Backend deserialize enum dạng chuỗi và `DateTimeOffset`; idempotency backend dùng MessageId + SensorType. |
| Sensor coverage | **PASS có giới hạn đã biết** | Firmware gửi `AirTemperature` (`°C`), `AirHumidity` (`%`) và binary `WaterLevel` (`0/100%`). YL-69 chỉ log ADC thô; không gửi `SoilMoisture` cho đến khi hiệu chuẩn trong đất được cấu hình. |
| QoS 1 / queue deletion | **PASS với giới hạn** | MQTT 256dpi 2.5.2 gọi `lwmqtt_publish` cho QoS 1, đợi và decode PUBACK; firmware chỉ xóa sample khỏi queue nếu `publish()` trả true, giữ lại để retry nếu false. |
| QoS 1 limitations | **MEDIUM — documented** | PUBACK xác nhận broker nhận packet, không chứng minh Backend/DB/dashboard đã xử lý. Queue chỉ ở RAM và mất khi reset/mất nguồn. Library decode PUBACK packet ID nhưng không đối chiếu ID trả về với ID của publish hiện tại; hiện chỉ có một publish đồng bộ/in-flight, nhưng đây là hạn chế correlation cần lưu ý. Retries giữ MessageId ứng dụng để Backend deduplicate, nhưng không phát lại MQTT DUP flag/packet ID cũ. |
| Backend MQTT/telemetry unit tests | **PASS** | Filter `MqttTelemetryOnlyTests`, `MqttMessageHandlerTests`, `MqttPendingCommandDispatcherTests`: 20 passed, 0 failed, 0 skipped; QA độc lập chạy lại cùng filter và đạt 20/20. Không dùng SQL fixture, broker, hay hardware. |
| SQL telemetry integration tests | **NOT RUN** | Integration fixture là opt-in và tạo database disposable riêng. Không bật fixture trong lượt này; vì vậy không tuyên bố SQL duplicate-persistence test đã chạy lại. |
| Backend E2E Stage 1/2/3 | **PASS** | Launcher mới chạy với đúng `SmartFarmMini_E2E_20261125_9C4A`; Stage 1 MQTT disabled; Stage 2 xác nhận thiết bị đã active/persisted; Stage 3 `database=Ready`, `mqttBroker=Connected`, SUBACK `GrantedQoS1`, command dispatch false, ACK subscription false, `telemetryReady=true`. |
| Independent Backend readiness QA | **PASS** | QA GET `/health/ready` trả HTTP 200; đúng E2E DB, TLS/8883, backend username match, exact telemetry filter, GrantedQoS1, thiết bị active, dispatch/ACK subscription false, telemetryReady true. |
| Backend process | **RUNNING** | Operational E2E Backend để lại chạy trên `127.0.0.1:5206` sau khi Stage 3 đạt. Connection string/secret không được hiển thị. |
| MQTT ACL — Backend Subscribe | **PASS** | Harness và Backend đều nhận `GrantedQoS1` khi subscribe exact telemetry topic. |
| MQTT ACL — ESP32 Publish | **PASS — user-confirmed, not independently exported** | Người dùng đã xác nhận `smartfarm_esp32_001` được phép publish đúng `smartfarm/device/FARM-ESP32-001/telemetry` và rule mặc định deny `#`. Không có ACL export/read-only console snapshot trong lượt này; không gửi publish probe. |
| Dedicated test publisher / persistence probe | **NOT RUN** | Không có publisher riêng được xác nhận cho phép publish vào identity/topic firmware này; không phát synthetic telemetry. Backend SQL persistence từ publisher không được kiểm thử trong lượt này. |
| SmartFarmMiniDb / pending commands | **PASS — no access/change** | Mọi Backend E2E chỉ dùng DB disposable đã ghim trong launcher; không truy cập `SmartFarmMiniDb`, không sửa năm lệnh Pending. |
| Hardware / actuators | **NOT RUN** | Không flash ESP32, không activate relay/pump, không publish MQTT command. |

## Root evidence và code review

- Real config xác nhận `MqttHost`, `MqttPort=8883`, `MqttUseTls=true`, `TelemetryOnly=true`, DeviceCode và username thiết bị; credentials không được in.
- CA được kiểm thử bằng TLS-only custom-root validation tới EMQX. Hệ thống Windows cũng xác thực hostname/certificate chain; không gửi MQTT message trong phép thử này.
- `main.cpp` đăng ký callback command và khởi tạo command ledger chỉ khi TelemetryOnly tắt; hàm `subscribeToCommands` trả trước khi subscribe nếu TelemetryOnly bật; ACK helper trả false trong chế độ này.
- Backend contract trong `MqttMessageHandler` chấp nhận GUID MessageId, SensorType enum, decimal value, unit và timestamp nullable; endpoint topic kiểm tra DeviceCode đã đăng ký/active. Backend dedup filter theo MessageId + SensorType.
- Backend launcher parser đã được sửa ở lượt trước để trim định dạng whitespace từ `dotnet user-secrets list`; CONNECT/SUBACK và runtime readiness đã pass.

## Thay đổi trong lượt QA

- Sửa sáu test constructor call sites để truyền `Options.Create(new MqttBrokerSettings())`, vì `HealthController` đã yêu cầu MQTT settings nhưng unit tests còn gọi constructor cũ. Không đổi production logic.
- Tệp đã sửa: `backend/SmartFarm.UnitTests/Controllers/HealthControllerReadinessTests.cs`, `backend/SmartFarm.UnitTests/Controllers/BackendEndpointsTests.cs`.
- Firmware source/config không bị sửa trong lượt này.

## Hướng dẫn phạm vi cho phiên giám sát

1. Chỉ nạp firmware build này nếu người giám sát xác nhận đúng bo ESP32 và cáp/COM port.
2. Giữ TelemetryOnly true; không thay DeviceCode, broker, CA hay tài khoản trong lúc flash.
3. Theo dõi Serial Monitor: Wi-Fi, NTP trusted UTC, TLS/MQTT connect và telemetry QoS 1 ack. Không gọi lệnh command.
4. Xác minh Backend health vẫn giữ dispatch false và telemetry subscription GrantedQoS1.
5. Đánh giá riêng dữ liệu soil moisture: firmware hiện không gửi giá trị YL-69 đã hiệu chuẩn.
6. Dừng phiên nếu TLS/CA, identity, MQTT connection hoặc thiết bị Backend active không khớp.

## Verdict

**GO — supervised telemetry-only flash** dựa trên config/build/runtime/QA hiện có. Đây không phải GO cho actuator control hoặc production deployment. Firmware chưa được flash; telemetry thực từ ESP32, lưu DB và dashboard sau flash vẫn cần được kiểm chứng trực tiếp trong phiên có giám sát.

Không publish MQTT trong lượt này. Không flash, điều khiển phần cứng, truy cập database thật, commit, push hoặc merge.
