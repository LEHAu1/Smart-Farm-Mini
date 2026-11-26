# Báo cáo E2E Telemetry qua EMQX Cloud

**Ngày:** 25/11/2026  
**Branch:** `feature/iot-end-to-end-integration`

## Kết luận

Luồng E2E hiện **BLOCKED tại quyền MQTT publish của broker**. Backend E2E đã kết nối EMQX và subscribe được; tài khoản `smartfarm_backend` nhận `NotAuthorized` khi publisher harness thử gửi telemetry tới topic thiết bị tổng hợp. Vì broker không nhận telemetry nên Backend không ingestion, SQL không có SensorReadings mới và Dashboard giữ `--`.

| Chặng | Trạng thái | Bằng chứng |
|---|---|---|
| Contract telemetry từ source | **PASS (đã xác định)** | Topic chuẩn `smartfarm/device/{DeviceCode}/telemetry`; payload/schema bên dưới. |
| SQL E2E riêng + migration | **PASS** | `SmartFarmMini_E2E_20261125_9C4A`, 7/7 migrations, 14 bảng, EF không có model drift. |
| Backend runtime config | **PASS** | Tiến trình riêng; connection string ghi đè sang DB E2E; EMQX TLS/8883, client ID riêng, filter đúng một DeviceCode test, dispatch=false. |
| TLS / MQTT CONNECT / Authentication | **PASS** | Backend runtime và publisher harness nhận `Success`; password không in. |
| Backend Subscribe telemetry | **PASS** | EMQX đã cấp `GrantedQoS1` cho filter chuẩn `smartfarm/device/+/telemetry`; Backend E2E kết nối và subscribe filter của test device. |
| Command dispatch safety | **PASS (application guard)** | Runtime `CommandDispatchEnabled=false`; hosted service/dispatcher/publisher có guard; không thấy command query/publish trong log. Broker command ACL chưa được probe. |
| MQTT publisher telemetry | **FAIL (ACL)** | 6 publish telemetry hợp lệ và 1 payload invalid đều trả `NotAuthorized`; broker không chuyển chúng tới Backend. Không có publisher account riêng trong User Secrets. |
| Backend ingestion / validation / dedup | **BLOCKED** | Không có message được broker chấp nhận; chưa kiểm tra handler/duplicate/index qua MQTT. |
| SQL SensorReadings persistence | **BLOCKED** | Hậu kiểm DB sau publish: `SensorReadings=0`; thiết bị synthetic còn offline. |
| Frontend register/device persistence | **PASS** | Browser MCP: register 200, create device 201; thiết bị còn trong danh sách sau tải lại. |
| Dashboard SignalR realtime | **PARTIAL** | Dashboard, API và SignalR WebSocket đều connected; chưa có message telemetry nên không thể xác minh cập nhật giá trị realtime. Các sensor vẫn `--`. |
| Firmware vật lý / actuator | **NOT VERIFIED** | Chỉ dùng mã nguồn và dữ liệu tổng hợp; không flash/không điều khiển phần cứng. |

## Contract theo source

- **Topic chuẩn:** `smartfarm/device/{DeviceCode}/telemetry`; handler đòi đúng 4 segment, tiền tố `smartfarm/device` và suffix `telemetry`.
- **DeviceCode:** backend tra theo code trong topic, bỏ qua device không tồn tại/inactive. Validator chấp nhận 1–50 ký tự chữ/số/`_`/`-`. Device dùng trong E2E: `FARM-E2E-25NOV26-9C4A` (chỉ tồn tại trong DB disposable).
- **JSON:** `messageId` (non-empty GUID), `sensorType` (enum string), `value` (decimal), `unit` (không rỗng), `recordedAtUtc` (DateTimeOffset tùy chọn, normalize UTC).
- **SensorType:** SoilMoisture=1, AirTemperature=2, AirHumidity=3, WaterTemperature=4, WaterLevel=5. Firmware trong repo hiện gửi AirTemperature °C, AirHumidity %, WaterLevel %; không gửi SoilMoisture, chỉ log ADC YL-69.
- **Ranges trong domain:** soil 0–100, air humidity 0–100, temperature −50–100, water level không âm. Backend không ràng buộc unit theo SensorType.
- **Dedup:** unique filtered index `(MessageId, SensorType)` `IX_SensorReadings_MessageId_SensorType`; duplicate SQL 2601/2627 trên index được handler bỏ qua.
- **Online state:** topic hợp lệ với device active sẽ cập nhật online trước khi parse/validate payload; heartbeat timeout mặc định 90 giây. Vì vậy payload invalid tới được handler vẫn có thể refresh online.

Nguồn contract đã đọc: `MqttTopicConstants.cs:6-9`, `MqttMessageHandler.cs:40-48, 58-68, 104-158, 254-270`, `CreateDeviceValidator.cs:16-20`, `SensorReading.cs:73-107`, `SensorReadingConfiguration.cs:50-55`, `DeviceHeartbeatService.cs:67-83`, `firmware/esp32-controller/telemetry/src/main.cpp:84-110,145-166,382-393`.

Payload hợp lệ được dùng làm mẫu kiểm thử theo contract:

```json
{"messageId":"a7e40f27-5d6a-4f00-a2f1-0fb68d35c88f","sensorType":"AirTemperature","value":27.5,"unit":"°C","recordedAtUtc":"2026-11-25T10:00:00Z"}
```

Payload invalid dự kiến phải bị domain validation từ chối:

```json
{"messageId":"b8f50f27-5d6a-4f00-a2f1-0fb68d35c881","sensorType":"AirHumidity","value":120,"unit":"%","recordedAtUtc":"2026-11-25T10:00:00Z"}
```

Harness đã tạo payload theo hai trường hợp trên cùng các SensorType khác, nhưng tất cả publish đều bị EMQX từ chối trước khi Backend nhận; do đó chưa coi validation hay dedup là đã test.

## Database E2E và isolation

- SQL Server LocalDB instance: `LAPTOP-UKV16E8V\LOCALDB#FA3B6E36`.
- Database: `SmartFarmMini_E2E_20261125_9C4A`; đã xác nhận database chưa tồn tại trước khi tạo; MDF/LDF dành riêng cho DB này.
- MDF: `C:\Users\Lenovo\SmartFarmMini_E2E_20261125_9C4A.mdf`; LDF: `C:\Users\Lenovo\SmartFarmMini_E2E_20261125_9C4A_log.ldf`.
- 7/7 migration đã áp dụng, 14 user tables; migration history đủ 7 dòng, ProductVersion `10.0.13`; `dotnet ef migrations has-pending-model-changes` báo không có thay đổi model.
- Fingerprint schema read-only: `9C9F59BED2B5DEA5FEA7FF69F2482089BF1687F46B1C60F01B5D1DF327E4BBFA`.
- Trước E2E: Users/Devices/SensorReadings/DeviceCommands đều 0. Sau browser: Users=1, Devices=1. Sau publish bị từ chối: SensorReadings=0, Pending DeviceCommands=0, device `IsOnline=0`.
- Backend được khởi chạy bằng tiến trình riêng trên `127.0.0.1:5205`; connection string process override xác định rõ database E2E. Không khởi chạy Development API với connection string mặc định.
- `SmartFarmMiniDb` không được đọc/ghi trong E2E. Năm Pending START_PUMP trong DB thật không bị truy vấn hoặc thay đổi.

## EMQX, runtime và command safety

- Effective config được kiểm tra trước khi chạy: host `w9d01192.ala.asia-southeast1.emqxsl.com`, port 8883, TLS=true, username `smartfarm_backend`, secret password present nhưng không đọc/in, `CommandDispatchEnabled=false`, telemetry filter chỉ cho `FARM-E2E-25NOV26-9C4A`, ACK filter rỗng.
- WebAPI E2E `/health/ready`: `Ready`, `database=Ready`, `mqttBroker=Connected`. Log xác nhận subscribe filter cấu hình.
- Backend credentials độc lập đã nhận SUBACK `GrantedQoS1` khi subscribe `smartfarm/device/+/telemetry`.
- Telemetry publisher harness dùng ClientId riêng, chỉ thử topic telemetry của DeviceCode tổng hợp. Broker trả `NotAuthorized` cho các lần publish; không có message được nhận.
- Không có test-publisher credentials riêng trong User Secrets. Vì vậy quyền publisher tối thiểu/chỉ publish test-device topic chưa được xác minh bằng principal riêng.
- Không có command publish. Source guard + unit tests duy trì dispatch false. Probe ACL publish rỗng vào command topic bị auto-review chặn trước khi chạy vì đây vẫn là MQTT PUBLISH có side effect; broker-side command ACL vì vậy **NOT VERIFIED**. Không thử workaround.

## Browser MCP evidence

- Frontend thật từ `frontend/smartfarm-web` tại `http://127.0.0.1:5173`; API E2E tại `http://127.0.0.1:5205`.
- Tài khoản test đăng ký trên UI, vào Dashboard; thao tác Add Device tạo `FARM-E2E-25NOV26-9C4A` qua UI. Network: `POST /api/Auth/register` 200, `POST /api/devices` 201, dashboard/summary/devices 200, SignalR negotiate 200.
- Browser ghi nhận SignalR WebSocket `Connected`; API `/health/ready` trả DB Ready và MQTT Connected.
- Backend stdout/stderr evidence: `.ai/e2e-logs/backend-e2e.stdout.log`, `.ai/e2e-logs/backend-e2e.stderr.log`.
- Sau khi broker chặn publish, Dashboard vẫn hiển thị device offline, sensor values `--`. Do không có telemetry, không đánh dấu realtime value update hoặc refresh data persistence PASS.
- Console có Google GIS 403 `origin is not allowed for the given client ID`; local email/password E2E không bị lỗi này. Đây là giới hạn Google OAuth origin, không phải telemetry.

## Test results

- WebAPI build: **PASS**, 0 warnings / 0 errors.
- Frontend tests coordinator run #1: **27/28**, một assertion timing trong `Login.test.tsx`; lần chạy riêng sau đó **28/28 PASS**. Independent QA frontend rerun: **28/28 PASS**.
- Backend test coordinator run: **BLOCKED**, VSTest không kết nối testhost trong 90 giây; test run aborted. Independent QA rerun cũng **BLOCKED** cùng timeout; TRX QA báo tổng/executed 0. Baseline trước task là 173 passed / 10 skipped, nhưng lần chạy hiện tại chưa xác minh lại.
- Database migration and schema checks: **PASS**, chỉ trên disposable E2E DB.
- Browser registration/device workflow: **PASS**; browser telemetry readings: **BLOCKED** bởi publish ACL.

## QA độc lập

- QA xác nhận độc lập: đúng DB disposable, 7/7 migrations, 1 test user, 1 synthetic device, 0 SensorReadings, 0 pending commands, device offline; backend log có EMQX connection/subscription và không có command publish evidence.
- QA Browser MCP read-only: API Healthy, MQTT Connected, SignalR Connected; sensor cards `--`; registration/API statuses phù hợp; Google GIS 403.
- QA frontend test rerun: **28/28 PASS**.
- QA backend test rerun: **BLOCKED** do testhost timeout 90 giây, 0 tests executed trong TRX.
- QA không publish MQTT, không truy cập hardware, không sửa DB.

## Cần làm tiếp

1. Tạo/ủy quyền một MQTT test-publisher principal riêng với quyền publish đúng `smartfarm/device/FARM-E2E-25NOV26-9C4A/telemetry`; không cấp `#` hoặc quyền command. Hoặc điều chỉnh ACL hiện tại để publisher test được quyền tối thiểu trên topic đó.
2. Giữ Backend subscriber chỉ trên topic synthetic device, dispatch=false, DB E2E.
3. Khi có quyền publisher, chạy lại hợp lệ/invalid, duplicate MessageId, DB row count, SignalR update và browser refresh; hậu kiểm Pending commands vẫn 0.
4. Thực hiện command-topic ACL verification chỉ bằng phương thức broker-side read-only/ACL simulator nếu có; không gửi command publish probe.

**Không commit, push, merge, flash firmware, khởi động relay/bơm hoặc thay đổi database thật.**

## Follow-up — Kiểm tra hai MQTTX message ngày 25/11/2026

### Kết quả hiện tại

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Backend E2E đang chạy và subscribe | **FAIL / NOT RUN hiện tại** | Không có listener trên `127.0.0.1:5205`; tiến trình Backend E2E đã dừng. Log cũ chỉ xác nhận Backend từng kết nối EMQX và subscribe filter đã cấu hình, không chứng minh đang hoạt động lúc MQTTX publish. |
| Frontend/Dashboard hiện tại | **BLOCKED** | Không có listener trên `127.0.0.1:5173`; Chrome Browser MCP mở `http://127.0.0.1:5173/dashboard` nhận `net::ERR_CONNECTION_REFUSED`. Không thể kiểm tra dashboard hiện thời. |
| Broker chấp nhận hai PUBLISH MQTTX | **NOT VERIFIED** | Không có packet capture/PUBACK hoặc log/diagnostic phía EMQX cho hai thời điểm publish. MQTTX thao tác publish đơn thuần không đủ chứng minh broker nhận/chuyển tiếp. |
| Backend ingestion/log cho MessageId | **NOT FOUND** | Tìm trong log Backend E2E không thấy MessageId `a7e40f27-5d6a-4f00-a2f1-0fb68d35c88f` hoặc DeviceCode `FARM-E2E-25NOV26-9C4A`. Log cũ không ghi nhận telemetry ingestion/duplicate handling. |
| SensorReadings trong DB E2E | **FAIL (không được ingest)** | Read-only query trên `SmartFarmMini_E2E_20261125_9C4A` trả 0 reading `AirTemperature` với MessageId này và 0 hàng tương ứng trong phép nhóm `(MessageId, SensorType)`. |
| Deduplication | **NOT VERIFIED** | Vì database không có reading đầu tiên, không thể kết luận hai bản tin đã được nhận rồi gộp thành một. |
| Device heartbeat/online | **FAIL (không được cập nhật)** | Thiết bị synthetic `FARM-E2E-25NOV26-9C4A` có `IsOnline=0`, `LastSeenAtUtc=NULL`. |
| Pending commands | **PASS — không có lệnh test** | DB E2E có 0 pending command. Không có MQTT command nào được publish trong lượt kiểm tra này. |
| QA độc lập read-only | **PASS cho xác minh trạng thái** | QA độc lập xác nhận không có listener ở 5205/5173, không tìm thấy log ingestion, DB E2E có 0 reading khớp MessageId, thiết bị offline/LastSeen null, pending commands = 0. QA không kết nối MQTT, không sửa DB, không truy cập DB thật/hardware. |

### Kết luận và giới hạn

Hai message MQTTX **chưa được chứng minh là đã đến Backend**. Tại thời điểm kiểm tra, Backend và Frontend E2E không chạy; database test không có reading và không có heartbeat. Do đó luồng dừng trước ingestion/persistence, còn broker-side acceptance và deduplication không thể xác nhận hồi tố từ trạng thái hiện tại. Điều này không chứng minh chắc chắn broker đã từ chối: cần bằng chứng PUBACK hoặc EMQX client/message diagnostics được lưu tại thời điểm publish.

Hai message đã gửi trước khi Backend chạy/dừng không tự được xử lý khi khởi động lại, trừ khi broker/session đã lưu chúng theo QoS, persistent session và subscription tương ứng; hiện không có bằng chứng về điều đó. Chỉ khởi động Backend sau đó không đủ để nhận lại message non-retained đã qua.

### Bước cần thiết cho lần kiểm thử kế tiếp

Để kiểm chứng duplicate thật sự, cần chạy lại một lượt có kiểm soát trên cùng database disposable: xác nhận `CommandDispatchEnabled=false` và filter chỉ trỏ tới DeviceCode tổng hợp; khởi động subscriber trước; ghi lại PUBACK/EMQX diagnostics của publisher cho cả hai lần gửi cùng MessageId; rồi xác minh đúng một hàng trong `SensorReadings`, heartbeat thiết bị và cập nhật Dashboard/SignalR. Không dùng `SmartFarmMiniDb`, không publish command và không điều khiển phần cứng. Lượt hiện tại không tự gửi lại message.
