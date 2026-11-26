# Báo cáo hardening độ tin cậy lệnh MQTT

**Dự án:** Smart Farm Mini  
**Nhánh:** `feature/iot-end-to-end-integration`  
**Kết luận:** **NO-GO cho kết nối MQTT tới thiết bị vật lý** cho đến khi xác minh firmware thực tế và diễn tập lại migration mới.

## Tóm tắt

- API chỉ ghi lệnh Pending; `PendingCommandDispatcher` là đường publish duy nhất.
- Lease bền vững trong SQL Server phối hợp claim giữa nhiều WebAPI instance. Câu UPDATE có điều kiện dùng UTC của DB, hạn lệnh, attempt limit và trạng thái/heartbeat thiết bị.
- Publish không chắc chắn giữ lease đến hết cooldown. Chỉ lỗi xác nhận packet chưa bắt đầu mới nhả lease và hoàn lại lượt thử.
- Firmware repository subscribe topic lệnh, xác thực ID/UTC/expiry, lưu/replay ACK `Failed` trong NVS. Firmware này **không điều khiển relay/bơm và không ACK thành công**.
- Backend unit suite: 167/167 PASS; command/MQTT focused: 15/15 PASS. QA độc lập báo cùng kết quả.
- Migration được rehearsal Up/Down/Up trên LocalDB test riêng. `SmartFarmMiniDb` không bị truy vấn hay thay đổi.
- Không chạy broker/backend, gửi MQTT thật hoặc nạp ESP32.

## Kiến trúc trước và sau

**Trước:** `DeviceCommandService` lưu rồi publish tức thì; `MqttHostedService` cũng quét Pending khi connect/reconnect và theo tick. Hai đường có thể gửi cùng command. Khóa RAM chỉ tuần tự hóa dispatcher trong một process. MQTT QoS 1 cho phép giao lặp; firmware source chưa deduplicate command.

**Sau:** API chỉ lưu lệnh. Dispatcher duy nhất publish sau khi claim lease nguyên tử trong DB. Các instance cùng tranh một command ID chỉ có một claim. Lease hết hạn cho phép khôi phục sau crash. Command ID giữ nguyên qua retry. Firmware source lưu ledger ACK theo ID và từ chối lặp an toàn.

QoS 1 vẫn là **at-least-once**, không phải exactly-once. Nếu publish tới thiết bị nhưng ACK thất lạc, backend có thể retry sau lease; firmware phải nhận ra cùng `commandId`. Điều này mới được thêm vào source repository, chưa xác minh trên firmware ESP32 đang chạy.

## Cơ chế ownership và trạng thái

- `DeviceCommandService.CreateCommandAsync`: validate request/device, đặt `ExpiresAtUtc`, lưu Pending; không publish.
- `PendingCommandDispatcher`: quét khi MQTT connect/reconnect và theo chu kỳ; bỏ qua command hết hạn, thiết bị inactive/offline/heartbeat cũ và command vượt retry limit.
- `TryAcquireDispatchLeaseAsync`: UPDATE nguyên tử chỉ khi command Pending/chưa hết hạn/chưa vượt attempt limit/lease trống hoặc hết hạn; thiết bị active, online, not-deleted và có `LastSeenAtUtc` mới.
- SQL dùng `SYSUTCDATETIME()` để tránh đồng hồ lệch giữa các instance quyết định lease đã hết hay chưa. Lease bị giới hạn 1–600s; heartbeat window 15–86400s; attempt limit 1–20.
- `ReleaseDispatchLeaseAsync` chỉ xóa lease đúng owner khi command còn Pending. Chỉ `MqttPublishNotStartedException` gọi release. Timeout/lỗi mơ hồ giữ lease và attempt count.
- ACK trạng thái cuối xóa lease. Command hết hạn vẫn Pending vì delivery có thể mơ hồ, nhưng sẽ không được publish lại.

**Giới hạn:** trạng thái thiết bị có thể đổi sau claim và trước publish. Publish lâu hơn lease có thể được thử lại khi lease hết hạn. Cùng ID và firmware dedup bảo vệ tình huống này, nhưng firmware vật lý chưa được xác nhận.

## Migration và DB

Migration `20261125012849_AddDeviceCommandDispatchLeases` thêm:

- `ExpiresAtUtc`; backfill row cũ thành `CreatedAtUtc + 10 phút`, rồi đặt NOT NULL.
- `DispatchLeaseOwnerId`, `DispatchLeaseUntilUtc`, `DispatchAttemptCount`.
- Index `IX_DevCmds_DispatchLease`.

Migration không đổi trạng thái hay xóa dữ liệu nghiệp vụ. Down chỉ bỏ index và các cột mới.

**Rehearsal:** chỉ trên `(localdb)\MSSQLLocalDB / SmartFarmMiniDb_LeaseTest_20261125`. DB test mới nhận 1 user, 1 device, 2 command `TEST_ONLY`. Up, Down về migration trước, rồi Up lại đều exit 0. Sau Down, hai command vẫn giữ ID/code/action/status/CreatedAt, số dòng vẫn 2. Sau Up lại, hai row vẫn Pending; có expiry/lease/attempt columns và index. Cuối cùng có 7 migration history records, 1 user, 1 device, 2 command giả lập. DB test giữ nguyên, không drop/cleanup.

Hai claim SQL đồng thời với owner khác nhau cho kết quả một claim thành công và một claim bị từ chối; attempt count cuối là 1. Đây là rehearsal SQL dùng predicate/DB clock như repository, không phải test tự động gọi repository. QA độc lập chỉ đọc xác minh DB test và rà source; QA không chạy lại thao tác ghi concurrency.

`SmartFarmMiniDb` không được kết nối trong task này. Adoption script trước đây dự kiến 6 migration records đã lỗi thời; migration mới làm lineage test thành 7. Cần cập nhật và QA lại deployment/adoption script trên bản sao mới trước khi xem xét DB thật. Không dùng script cũ hoặc chạy `dotnet ef database update` trên DB thật.

EF drift check read-only: `dotnet ef migrations has-pending-model-changes ...` báo **không có thay đổi model kể từ migration cuối**. Có cảnh báo EF về sentinel/default cho enum `CommandStatus`; không làm fail build.

## Firmware

- `telemetry/include/command_protocol.h`: parser có giới hạn, UUID command ID, UTC parser, expiry 10 phút và clock skew tương lai tối đa 60 giây; ledger tối đa 32 ACK Failed.
- `telemetry/src/main.cpp`: subscribe QoS 1 vào `smartfarm/device/{DeviceCode}/command`; lưu ledger trong NVS trước khi ACK; replay cached ACK khi command ID lặp.
- UTC/NVS không tin cậy, hỏng, đầy hoặc write lỗi đều fail-closed; không thực thi lệnh. Sketch luôn trả Failed vì actuator chưa được implement.
- Firmware `CommandMaxAgeSeconds` cần đồng bộ với backend `Mqtt:PendingCommandExpiryMinutes` (mặc định 10 phút).

**Chưa xác minh:** không có C++ host compiler trong PATH. PlatformIO CLI có nhưng sandbox không cho ghi cache người dùng; chuyển cache vào workspace thì tải platform `espressif32` bị `HTTPClientError`. Firmware build/host test chưa chạy; không nạp thiết bị. Không biết firmware hiện tại trên ESP32 có phải source này không.

## Ma trận kiểm thử

| Kịch bản | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| API tạo Pending, không publish trực tiếp | PASS | Unit test; source chỉ còn dispatcher gọi publisher |
| Hai dispatcher tranh command | PASS | In-memory atomic lease fake; không thay DB locking |
| Hai SQL claims đồng thời | PASS, rehearsal | DB test riêng: 1 claim/0 claim; QA không rerun write test |
| Offline/stale heartbeat | PASS | Fake publisher/lease tests; repository còn predicate DB |
| Expiry và reconnect | PASS | Unit simulation + migration backfill trên DB riêng |
| Active lease/reconnect sớm | PASS | Fake lease |
| Publish ambiguous/lost ACK, retry cùng ID | PASS | Fake publisher; không có broker thật |
| ACK đến muộn | PASS | Unit simulation loại command khỏi pending queue |
| Chắc chắn chưa bắt đầu publish | PASS | Unit test release lease/hoàn attempt |
| Crash/restart và lease recovery | PASS | Fake lease test; SQL crash recovery không được QA chạy lại |
| MQTT duplicate qua firmware parser/ledger | NOT VERIFIED runtime | Source và host test có; chưa compile/chạy do thiếu toolchain |
| Broker → firmware → ACK E2E | NOT RUN | Không khởi động broker/backend |
| ESP32 vật lý/actuator/firmware đang nạp | NOT RUN | Không flash, không gửi lệnh |
| Migration Up/Down/Up | PASS | LocalDB disposable; dữ liệu giả lập giữ nguyên |
| EF model drift | PASS | Read-only check không có pending model changes |

## Build, test và QA

- WebAPI build do persistence agent chạy: exit 0, 0 warning/error.
- Test project compile thành công.
- Lần test đầu ngoài sandbox: 2 PASS/10 FAIL do Moq callback thiếu một tham số; test harness đã sửa.
- VSTest trong sandbox thất bại loopback với SocketException 10013. Chạy test đã được ủy quyền ngoài sandbox hoạt động.
- Coordinator focused suite: 15/15 PASS, exit 0; [TRX](mqtt-reliability-trx/mqtt-command-focused.trx), [diagnostics](mqtt-command-focused.diag).
- Coordinator full backend suite: 167/167 PASS, exit 0; [TRX](mqtt-reliability-trx/mqtt-reliability-full.trx), [diagnostics](mqtt-reliability-full.diag).
- QA độc lập rerun báo focused 15/15 PASS và full 167/167 PASS, exit 0. QA không khởi động service/broker hoặc sửa DB.
- `git diff --check`: PASS; chỉ cảnh báo chuẩn hóa LF/CRLF.

## Lệnh Pending cũ và rủi ro

Năm command Pending cũ trên `SmartFarmMiniDb` không được đọc, cập nhật hay gửi đi. Rehearsal chỉ dùng hai command giả lập `TEST_ONLY`. Migration rehearsal backfill command cũ hơn 10 phút thành expired; dispatcher bỏ qua nhưng không tự đổi Pending sang Failed. Trước khi bật MQTT sau này, cần kiểm tra queue trên DB được duyệt và rà soát command còn hiệu lực.

## Safe deployment sequence

1. Giữ dispatcher/MQTT backend dừng hoặc disabled.
2. Cập nhật deployment/adoption plan từ 6 lên 7 migration records; rehearsal lineage mới trên DB copy và kiểm tra dữ liệu/schema/concurrency.
3. Biên dịch firmware khi PlatformIO đủ dependencies; chạy host parser/ledger tests; đối chiếu device code, topic và expiry.
4. Xác định chính xác firmware đã nạp. Trước khi bật actuator, cần phê duyệt/deployment riêng và thử trong môi trường cô lập.
5. Chỉ sau phê duyệt riêng mới tạo backup/preflight/maintenance window và adoption/migration mới cho `SmartFarmMiniDb`. Báo cáo adoption trước không bao phủ migration mới.
6. Sau khi schema được phê duyệt, khởi động API với MQTT tắt; kiểm tra readiness/queue. Chỉ bật MQTT sau khi firmware được xác minh và được phê duyệt vận hành.

## Tình trạng thay đổi

Các file code chính của phần hardening này:

- `backend/SmartFarm.Application/Common/Configurations/DeviceCommandQueueOptions.cs`
- `backend/SmartFarm.Application/Contracts/Persistence/IDeviceCommandRepository.cs`
- `backend/SmartFarm.Application/Contracts/Services/IDeviceCommandService.cs`
- `backend/SmartFarm.Application/DTOs/DeviceCommand/DeviceCommandDto.cs`
- `backend/SmartFarm.Application/Services/DeviceCommandService.cs`
- `backend/SmartFarm.Domain/Entities/DeviceCommand.cs`
- `backend/SmartFarm.Infrastructure/DependencyInjection.cs`
- `backend/SmartFarm.Infrastructure/Persistence/Configurations/DeviceCommandConfiguration.cs`
- `backend/SmartFarm.Infrastructure/Persistence/Repositories/DeviceCommandRepository.cs`
- `backend/SmartFarm.Infrastructure/Persistence/Migrations/20261125012849_AddDeviceCommandDispatchLeases.cs` và `.Designer.cs`; `SmartFarmDbContextModelSnapshot.cs`
- `backend/SmartFarm.WebAPI/BackgroundServices/MqttHostedService.cs` và `PendingCommandDispatcher.cs`; `backend/SmartFarm.WebAPI/Program.cs`
- `backend/SmartFarm.UnitTests/Services/DeviceCommandDispatchTests.cs` và `MqttPendingCommandDispatcherTests.cs`
- `firmware/esp32-controller/README.md`
- `firmware/esp32-controller/telemetry/README.md`, `src/main.cpp`, `include/command_protocol.h`, `tests/command_protocol_tests.cpp`

Source, migration, tests và báo cáo này ở working tree trên nhánh hiện tại. Không commit, push hoặc merge. Working tree có thay đổi từ các nhiệm vụ trước; chúng được giữ nguyên, không coi tất cả là của task này.

