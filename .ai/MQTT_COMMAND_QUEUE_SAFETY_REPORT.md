# Báo cáo an toàn hàng đợi lệnh MQTT

**Dự án:** Smart Farm Mini
**Branch:** feature/iot-end-to-end-integration
**Database kiểm tra:** (localdb)\MSSQLLocalDB / SmartFarmMiniDb
**Ngày đánh giá:** 24-11-2026
**Trạng thái:** Chỉ review và truy vấn read-only; không sửa DB/source, không publish MQTT, không bật Backend/Broker.

## 1. Kết luận

Database có đúng 5 bản ghi Pending, tất cả là START_PUMP cho FARM-ESP32-001. Thiết bị này hiện IsOnline=false. Thiết bị FARM-ESP32-003 có IsOnline=true nhưng không có lệnh Pending. Cả năm lệnh được tạo ngày 19-11-2026.

Theo code hiện tại, dispatcher tính hạn thử lại từ CreatedAtUtc và PendingCommandExpiryMinutes, giới hạn tối đa 1.440 phút (24 giờ). Ở trạng thái DB hiện tại, năm lệnh bị bỏ qua vì FARM-ESP32-001 đang offline; do nhánh offline đứng trước bước kiểm tra expiry nên expiry chưa được đánh giá trong lần quét đó. Tuy nhiên, nếu thiết bị reconnect, cả năm lệnh đã vượt giới hạn expiry tối đa và sẽ tiếp tục bị bỏ qua, vẫn giữ trạng thái Pending. Vì vậy source hiện tại không dự kiến publish lại chúng sau reconnect. Đây là kết luận dựa trên thời điểm DB, đồng hồ hệ thống hợp lệ và logic source; không phải quan sát runtime.

Rủi ro vẫn cần xử lý trước khi bật MQTT: trạng thái Pending không được đóng lại khi hết hạn; trạng thái retry trong RAM bị khởi tạo lại khi process restart; dispatcher không kiểm tra độ mới của LastSeenAtUtc; firmware trong repository hiện không nhận lệnh nhưng firmware đã nạp thực tế chưa được xác minh. START_PUMP có thể bật bơm nếu thiết bị đang chạy một firmware khác có subscribe topic lệnh và thực thi action này.

## 2. Năm lệnh Pending — truy vấn chỉ đọc

Hai lượt kiểm tra DB độc lập đều trả đúng năm dòng. Các truy vấn chỉ dùng SELECT; không cập nhật/xóa dữ liệu.

| Command ID | CommandCode | Device ID | Device Code | Command Type (Action) | Payload | CreatedAtUtc (UTC) | Expiry mặc định 10 phút | Giới hạn expiry tối đa 24 giờ | Status | ACK / Completed |
|---|---|---|---|---|---|---|---|---|---|---|
| 4D8200E7-7FA6-4322-926F-A7897BECFF24 | CMD-1795099037654-3604F4 | BB9D3157-BE61-4E59-B8DF-738958C7F961 | FARM-ESP32-001 | START_PUMP | NULL | 2026-11-19 14:37:17.6544437 +00:00 | 2026-11-19 14:47:17.6544437 +00:00 | 2026-11-20 14:37:17.6544437 +00:00 | Pending (1) | NULL / NULL |
| 2720B869-80E3-42E6-83D0-8CACD5C27330 | CMD-1795099219930-5F7F97 | BB9D3157-BE61-4E59-B8DF-738958C7F961 | FARM-ESP32-001 | START_PUMP | NULL | 2026-11-19 14:40:19.9301116 +00:00 | 2026-11-19 14:50:19.9301116 +00:00 | 2026-11-20 14:40:19.9301116 +00:00 | Pending (1) | NULL / NULL |
| 8171C834-74FA-4DD4-B7D8-DD2B20B4CCBE | CMD-1795099545447-FA9641 | BB9D3157-BE61-4E59-B8DF-738958C7F961 | FARM-ESP32-001 | START_PUMP | NULL | 2026-11-19 14:45:45.4474210 +00:00 | 2026-11-19 14:55:45.4474210 +00:00 | 2026-11-20 14:45:45.4474210 +00:00 | Pending (1) | NULL / NULL |
| F0BC059D-C824-4EAF-9F63-0F4E90E2A195 | CMD-1795100204478-9F3F41 | BB9D3157-BE61-4E59-B8DF-738958C7F961 | FARM-ESP32-001 | START_PUMP | NULL | 2026-11-19 14:56:44.4781972 +00:00 | 2026-11-19 15:06:44.4781972 +00:00 | 2026-11-20 14:56:44.4781972 +00:00 | Pending (1) | NULL / NULL |
| 744EFB87-A69B-4779-8ADC-741227A6246E | CMD-1795100325525-5CEFFC | BB9D3157-BE61-4E59-B8DF-738958C7F961 | FARM-ESP32-001 | START_PUMP | NULL | 2026-11-19 14:58:45.5259705 +00:00 | 2026-11-19 15:08:45.5259705 +00:00 | 2026-11-20 14:58:45.5259705 +00:00 | Pending (1) | NULL / NULL |

Schema DeviceCommands không có cột thời hạn/expiry. Thời hạn thử lại hiện được suy ra trong process từ CreatedAtUtc; không có CommandType riêng, nên loại lệnh được lấy từ cột Action. Các dòng trên có AcknowledgedAtUtc, CompletedAtUtc và ErrorMessage là NULL. Runtime override của PendingCommandExpiryMinutes không được đọc; cột expiry vì vậy thể hiện giá trị mặc định và giới hạn tối đa trong code, không khẳng định giá trị cấu hình đang chạy.

## 3. Trạng thái thiết bị đối chiếu

| Thiết bị | Device ID | IsOnline | IsActive | IsDeleted | LastSeenAtUtc (UTC) | Pending count |
|---|---|---:|---:|---:|---|---:|
| FARM-ESP32-001 | BB9D3157-BE61-4E59-B8DF-738958C7F961 | false | true | false | 2026-11-22 14:28:16.6707170 +00:00 | 5 |
| FARM-ESP32-003 | 6E5FDA69-B2BB-4AFE-A73B-246877AB194C | true | true | false | 2026-11-23 07:56:11.7063849 +00:00 | 0 |

FARM-ESP32-003 có trạng thái online cũ so với thời điểm đánh giá, nhưng không nhận năm lệnh này: các bản ghi đều tham chiếu Device ID của FARM-ESP32-001 và topic được dựng theo Device Code của thiết bị đích.

## 4. Luồng khởi động, reconnect và retry

- Program.cs:50-53 đăng ký MqttHostedService và DeviceHeartbeatService như các hosted service riêng.
- MqttHostedService.cs:32-38: nếu Mqtt:Enabled=false, service thoát mà không nối broker.
- MqttHostedService.cs:45-46: khi bật MQTT, service kết nối/subcribe rồi quét và dispatch lệnh Pending ngay trong startup.
- MqttHostedService.cs:48-68,74-99: khi mất kết nối, service chờ rồi reconnect; sau mỗi kết nối lại, nó quét Pending. Khi kết nối còn hoạt động, nó cũng quét theo retry interval.
- MqttHostedService.cs:117-124: chỉ bỏ qua thiết bị inactive/offline. Không kiểm tra LastSeenAtUtc trước khi publish.
- MqttHostedService.cs:113-145: retry mặc định 5 lần, expiry mặc định 10 phút; giá trị bị giới hạn lần lượt tối đa 20 lần và 1.440 phút. Expiry lấy từ CreatedAtUtc và lệnh hết hạn được giữ Pending, không chuyển sang trạng thái kết thúc.
- MqttHostedService.cs:126-133,147-170: số lần retry, thời điểm thử tiếp và cờ log chỉ lưu trong RAM; process restart tạo retry state mới. Expiry tuyệt đối vẫn dựa trên CreatedAtUtc, nên năm lệnh ngày 19-11 đã quá hạn ngay cả ở mức cấu hình tối đa.
- MqttClientService.cs:52-73: backend subscribe telemetry/ACK QoS 1. MqttPublisher.cs:27-40 publish lệnh tới smartfarm/device/{DeviceCode}/command với QoS 1; không đặt retained flag hoặc MQTT Message Expiry trong builder.
- MqttMessageHandler.cs:181-251: ACK phải có command ID hợp lệ, khớp thiết bị từ topic, và trạng thái hợp lệ. Luồng ACK xử lý Acknowledged, Completed, Failed; không kiểm tra lệnh đã quá expiry hay chưa.
- DeviceCommandService.cs:71-80,89-96: lệnh mới được lưu Pending trước khi publish ngay. Nếu publish chưa bắt đầu, lệnh được đánh dấu Failed; nếu kết quả publish không rõ, lệnh ở Pending để thử lại.

### Retry, QoS và idempotency

Retry count không bền qua restart. Sau một lỗi publish không rõ kết quả, cùng commandId được gửi lại; QoS 1 đảm bảo kiểu giao nhận ít nhất một lần, không bảo đảm action chỉ được thực thi một lần. Firmware nhận lệnh cần khử trùng lặp theo commandId và áp dụng TTL trước khi tác động phần cứng. Hiện firmware telemetry trong repo chưa thực hiện các chức năng nhận lệnh/ACK này.

## 5. Nguy cơ và khả năng tác động actuator

| Các lệnh | Trạng thái hiện tại | Đánh giá nguy cơ |
|---|---|---|
| Cả 5 START_PUMP của FARM-ESP32-001 | Hiện bị skip do thiết bị offline; nếu thiết bị reconnect thì expiry guard sẽ skip vì lệnh lớn hơn 24 giờ | Nguy cơ phát lại tự động hiện tại thấp theo logic source. Nếu một phiên bản phần mềm khác bỏ qua expiry hoặc đồng hồ/config sai, START_PUMP có thể bật bơm nếu firmware nhận lệnh. |
| FARM-ESP32-003 | IsOnline=true nhưng không có lệnh Pending | Không có lệnh cũ nào của thiết bị này để phát lại. Tuy nhiên, nếu sau này có Pending trong khi trạng thái online đã stale, dispatcher chỉ nhìn IsOnline; startup heartbeat và dispatcher chạy độc lập nên tồn tại cửa sổ race trước khi heartbeat đánh dấu offline. |

Firmware hiện có tại firmware/esp32-controller/telemetry/src/main.cpp:18-20,251-263 và firmware/esp32-controller/telemetry/README.md:18-27 chỉ gửi telemetry, không có subscribe command, relay/pump control hoặc ACK. Sketch hardware-check cũng không cấu hình GPIO26 hoặc chạy bơm. Do đó, firmware đang có trong repository không thể thực thi START_PUMP. Không xác minh được firmware hiện đang nạp trên ESP32 thật; khả năng điều khiển phần cứng ngoài repo vẫn chưa xác nhận.

## 6. Root cause và điểm cần gia cố

**Vì sao lệnh cũ được quét khi Backend khởi động:** sau MQTT connect, hosted service chủ động truy vấn toàn bộ lệnh Pending. Đây là queue retry có lưu DB, nên không có checkpoint dispatch bền vững để phân biệt “chưa từng gửi”, “broker đã nhận nhưng ACK ứng dụng chưa về”, hoặc “lệnh cũ cần loại khỏi queue”.

**Vì sao 5 lệnh cụ thể không được dự kiến publish lại:** chúng đã qua expiry tính từ lúc tạo. Dispatcher log expired và continue trước lệnh publish. Tuy vậy record vẫn Pending, khiến lịch sử gây hiểu nhầm và đòi hỏi người vận hành hiểu expiry runtime.

**Điểm yếu tiềm ẩn:**

1. Expiry không được lưu theo từng command trong database hoặc payload.
2. Dispatch eligibility chỉ kiểm tra IsActive/IsOnline, không kiểm tra freshness của heartbeat.
3. Pending có thể được publish ngay ở API path và đồng thời được quét ở hosted retry path; không có claim/outbox/dispatch lock bền vững, nên duplicate packet có thể xảy ra.
4. Retry state là RAM-only, và trạng thái hết hạn vẫn Pending.
5. ACK ứng dụng không chứng minh actuator đã ở đúng trạng thái vật lý; không xác minh firmware đang chạy trên thiết bị.

## 7. Giải pháp đề xuất

### Ngay trước khi bật MQTT

- Không sửa/xóa/chuyển trạng thái 5 dòng trong phạm vi review này.
- Giữ nguyên chúng để audit; không gửi lệnh thử.
- Khi vận hành lại, xác nhận clock backend UTC và giá trị expiry hiệu lực (không đọc/in secret); expiry bị clamp tối đa 24 giờ. Trên source hiện tại, năm lệnh cũ sẽ tiếp tục bị skip.
- Chưa bật command dispatch cho tới khi xác minh firmware đang nạp và broker ACL. Không coi IsOnline đơn lẻ là bằng chứng thiết bị hiện diện.

### Gia cố code trước khi cho phép điều khiển thật

1. Tách telemetry ingestion khỏi command dispatcher; đặt CommandDispatchEnabled=false mặc định. Cho phép bật riêng sau preflight/operator gate.
2. Lưu ExpiresAtUtc/TTL và trạng thái kết thúc Expired hoặc Cancelled có audit; không tự động replay các lệnh trước mốc enablement. Việc chuyển trạng thái dữ liệu thật cần phê duyệt riêng.
3. Yêu cầu heartbeat mới hơn ngưỡng DeviceOfflineAfterSeconds ngay trong cả tạo lệnh và dispatcher, ngoài cờ IsOnline.
4. Dùng outbox/claim nguyên tử có lease để tránh nhiều publisher cùng gửi; ghi nhận trạng thái dispatch rõ ràng và phân biệt broker PUBACK với ACK ứng dụng.
5. Firmware thực tế phải dùng allowlist, TTL và lưu/khử lặp commandId; kiểm thử relay trên mock trước, phần cứng chỉ sau phê duyệt riêng.
6. Thêm unit/integration tests cho: command quá hạn khi cold start, command hết hạn giữa hai tick, thiết bị stale-online, broker PUBACK nhưng thiếu ACK ứng dụng, reconnect trùng, và lệnh hợp lệ mới.

Không có thay đổi source hay schema nào được triển khai trong lần review này. Các đề xuất trên chưa được implementation/test; chúng cần một task phát triển riêng.

## 8. Kiểm thử và bằng chứng

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Hai truy vấn độc lập vào SmartFarmMiniDb | PASS, read-only | Cả hai xác minh 5 Pending, cùng thiết bị/action/timestamp; không sửa rows. |
| Backend command/ACK unit tests | PASS 7/7 | Lệnh dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore --filter "FullyQualifiedName~SmartFarm.UnitTests.Services.DeviceCommandDispatchTests|FullyQualifiedName~SmartFarm.UnitTests.Services.MqttMessageHandlerTests". Tests dùng mocks; không kết nối SQL thật/MQTT broker. |
| Hosted dispatcher expiry/reconnect tests | NOT RUN | Không có test trực tiếp cho private dispatcher trong MqttHostedService; chưa có regression test cho expiry cold start/dispatch gate. |
| Broker reconnect/command publish thực tế | NOT RUN | Cố ý không khởi động broker/backend và không publish. |
| Firmware/relay/bơm vật lý | NOT VERIFIED | Không flash hoặc điều khiển phần cứng; firmware đã nạp chưa xác minh. |

Lệnh truy vấn của DB agents chọn DeviceCommands nối Devices, lọc Status=1, lấy Id, CommandCode, DeviceId, DeviceCode, Action, Payload, CreatedAtUtc, status/ACK/completion/error và trạng thái thiết bị. Một truy vấn catalog riêng xác nhận không có cột expiry/timeout/deadline. Lệnh direct sqlcmd từ phiên điều phối hiện tại không truy cập được LocalDB do lỗi LocalDB instance registry; hai DB agent và QA agent chạy SELECT read-only bằng host execution xác minh các bản ghi khớp nhau. QA cũng độc lập xác minh source dispatch/retry, firmware capability và giới hạn kiểm thử.

## 9. Kế hoạch khôi phục MQTT an toàn

1. Không khởi động/restart Backend với MQTT bật cho tới khi xác minh runtime config, thiết bị/firmware, broker ACL và chọn chính sách cho năm lệnh Pending.
2. Không tự đánh dấu Failed/Expired và không xóa chúng; cần lựa chọn có audit trước khi thay đổi trạng thái DB.
3. Triển khai riêng command dispatch gate/expiry/heartbeat protections và kiểm thử bằng fake publisher cùng database disposable, không dùng DB thật hoặc broker thật.
4. QA độc lập kiểm tra các test mới, cold-start/reconnect và chứng minh stale command không gọi fake publisher.
5. Bật telemetry-only trước (nếu đã tách cấu hình), quan sát dữ liệu/online freshness; giữ dispatch tắt.
6. Chỉ bật điều khiển sau phê duyệt riêng và xác nhận firmware allowlist/idempotency/TTL, ACL, queue sạch theo chính sách đã được duyệt. Không gửi actuator command trong rehearsal.

## 10. QA độc lập

QA review độc lập về source xác nhận:

- MqttHostedService.cs:45-46 gọi dispatcher sau connect; startup/reconnect có thể quét Pending.
- Expiry lấy CreatedAtUtc, clamp tối đa 1.440 phút; các lệnh 19-11 quá hạn tại ngày đánh giá và vẫn Pending.
- Kết quả DB từ hai truy vấn SELECT độc lập: Device 001 offline và sở hữu cả 5 Pending; Device 003 có cờ online cũ nhưng không có Pending.
- Dispatcher không kiểm tra LastSeen freshness; heartbeat chạy riêng nên stale-online là rủi ro tiềm ẩn.
- Firmware telemetry trong repo không có command/relay/ACK path; actual flashed firmware chưa xác minh.
- Không service/broker/process nào được khởi động trong audit; không có MQTT publish hoặc DB mutation.

**QA verdict:** source-level conclusion PASS; runtime MQTT and physical behavior NOT VERIFIED. Không có patch code để QA hồi quy.

## 11. Hành động cần người dùng phê duyệt

- Phê duyệt riêng mọi thao tác thay đổi trạng thái/xóa các command Pending thật; hiện chưa thực hiện và không nằm trong quyền review.
- Phê duyệt task triển khai command dispatch gate, expiry bền vững, heartbeat freshness và outbox/idempotency test trước khi bật điều khiển thật.
- Xác nhận firmware nạp thực tế và broker ACL/session policy trước khi bật command dispatch.
- Giữ nguyên kế hoạch EF Migration History Deployment: báo cáo này không chạy migration, không tác động DB hoặc thay đổi maintenance window.

**Không commit, push hoặc merge.**

