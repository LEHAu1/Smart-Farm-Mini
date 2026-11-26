# Smart Farm Mini — Integration Readiness Phase 2

**Ngày:** 25-11-2026  
**Branch:** `feature/iot-end-to-end-integration`  
**Phạm vi:** rehearsal migration trên bản sao, firmware build, SQL lease tests, Auth/Device E2E, độc lập QA. Không ghi lên `SmartFarmMiniDb`, không bật broker thật, không điều khiển hoặc flash thiết bị.

## 1. Tóm tắt và verdict

| Phân hệ | Kết quả | Verdict |
|---|---|---|
| Migration rehearsal | Backup mới được xác minh; clone nhận đủ 7 migrations; EF update/no-op và model-drift check đạt | **PASS trên clone** |
| Firmware | PlatformIO compile-only thành công; không upload/flash; native parser tests chưa chạy | **PASS build; test native BLOCKED** |
| SQL lease integration | Gọi các phương thức repository/service thật qua LocalDB; 10/10 trong trạng thái cuối; QA độc lập rerun full suite | **PASS trong phạm vi harness** |
| Auth/Device Browser E2E | Register → Add Device → refresh → logout/login, ownership, dashboard summary và pattern đã qua trên clone | **PASS có giới hạn trên clone** |
| Database thật | Chỉ đọc; không áp dụng adoption/migration | **NO-GO cho triển khai ghi** |
| MQTT/phần cứng thật | Không kết nối broker/ESP32; firmware vật lý chưa xác minh | **NO-GO** |

Database clone và SQL tests là môi trường kiểm thử riêng. Các kết quả không cấp quyền thay đổi `SmartFarmMiniDb`, khởi động dispatcher/broker hoặc điều khiển phần cứng.

## 2. Migration deployment readiness

### Kế hoạch và rehearsal

Migration Architect xác nhận sequence an toàn trên disposable copy:

1. Tạo backup mới `COPY_ONLY, CHECKSUM`; `RESTORE VERIFYONLY` thành công.
2. Restore thành `SmartFarmMini_Phase2_20261125` với MDF/LDF riêng trong `.ai/`.
3. Chạy bản sao retarget của script adoption để ghi nhận đúng sáu migrations schema-lineage cũ, tất cả `ProductVersion=10.0.13`.
4. Chạy `dotnet ef database update AddDeviceCommandDispatchLeases` với connection trỏ rõ vào clone, áp migration thứ bảy.
5. Chạy hậu kiểm read-only, `dotnet ef database update` lần nữa và `dotnet ef migrations has-pending-model-changes`.

Không chạy script adoption gốc trên database thật: script hiện tại có guard/file assumptions gắn với `SmartFarmMiniDb` và sáu migration; không được dùng để triển khai migration thứ bảy. Không chạy EF database update trên DB thật.

### Bảy migration IDs trong clone

1. `20261105051702_InitialCreate_v2`
2. `20261113150000_SensorReadingCompatibilityFix`
3. `20261122120000_AddGoogleAuthColumns`
4. `20261124120256_CanonicalSchemaAlignment`
5. `20261124120435_IdentityKeyAndSoftDeleteIndex`
6. `20261124121439_RefreshTokenExpiryInvariant`
7. `20261125012849_AddDeviceCommandDispatchLeases`

Hậu kiểm xác nhận đúng 7 records trong `dbo.__EFMigrationsHistory`, ProductVersion đều `10.0.13`. Migration 7 thêm expiry/lease columns và `IX_DevCmds_DispatchLease`. `dotnet ef database update` no-op exit 0; `has-pending-model-changes` exit 0, không có model drift.

### Dữ liệu và fingerprint

Backup: `.ai/SmartFarmMiniDb_Phase2_20261125.bak` (8,966,144 bytes). Restore verification thành công. Clone files:

- `.ai/SmartFarmMini_Phase2_20261125.mdf`
- `.ai/SmartFarmMini_Phase2_20261125_log.ldf`

Số dòng trước/sau rehearsal khớp:

| Bảng | DB nguồn read-only | Clone sau migration |
|---|---:|---:|
| Users | 3 | 3 |
| Devices | 3 | 3 |
| SensorReadings | 7,827 | 7,827 |
| DeviceCommands | 5 | 5 |
| RefreshTokens | 26 | 26 |

QA độc lập tính lại fingerprint 202 thành phần: `94382E3F4F876A26F1FED710741CE2F7C838B8542F895CC87E60381F95D261A0`, khớp artifact của rehearsal.

### Pending START_PUMP và backfill expiry

Migration 7 backfill `ExpiresAtUtc = CreatedAtUtc + 10 phút`; không đổi Status, không publish và không xóa commands. Năm command của `FARM-ESP32-001` vẫn `START_PUMP / Pending`, attempt count `0`, lease null, payload null; tất cả đã quá hạn từ 19-11-2026. Các repository/dispatcher predicates loại commands đã hết hạn nên không được claim/dispatch sau migration. Các command vẫn tồn tại trong hàng đợi dưới trạng thái Pending; cần xử lý riêng bằng một thay đổi được xem xét/phê duyệt trước khi vận hành, không sửa trong rehearsal này.

| Command ID | CreatedAtUtc (2026-11-19) | ExpiresAtUtc theo backfill | Trạng thái trong clone |
|---|---|---|---|
| `4D8200E7-7FA6-4322-926F-A7897BECFF24` | 14:37:17.6544437Z | 14:47:17.6544437Z | START_PUMP / Pending; attempt 0; lease NULL |
| `2720B869-80E3-42E6-83D0-8CACD5C27330` | 14:40:19.9301116Z | 14:50:19.9301116Z | START_PUMP / Pending; attempt 0; lease NULL |
| `8171C834-74FA-4DD4-B7D8-DD2B20B4CCBE` | 14:45:45.4474210Z | 14:55:45.4474210Z | START_PUMP / Pending; attempt 0; lease NULL |
| `F0BC059D-C824-4EAF-9F63-0F4E90E2A195` | 14:56:44.4781972Z | 15:06:44.4781972Z | START_PUMP / Pending; attempt 0; lease NULL |
| `744EFB87-A69B-4779-8ADC-741227A6246E` | 14:58:45.5259705Z | 15:08:45.5259705Z | START_PUMP / Pending; attempt 0; lease NULL |

Migration `Down` sẽ bỏ expiry/lease metadata; không dùng làm rollback production khi ứng dụng mới đã chạy. Rollback ưu tiên dừng ứng dụng và khôi phục backup đã xác minh theo cửa sổ bảo trì.

### Tình trạng DB thật

`SmartFarmMiniDb` chỉ được kiểm tra read-only; schema, migration history, dữ liệu và 5 Pending commands không bị thay đổi. Rehearsal không đồng nghĩa với adoption/migration production đã sẵn sàng thực thi: deployment script cũ cần được cập nhật cho lineage 7 migrations và QA lại trên clone mới trước khi xem xét.

## 3. Firmware build results

- Nguyên nhân build trước: dùng một `PLATFORMIO_CORE_DIR` mới khiến PlatformIO tải lại package `espressif32`; lỗi `HTTPClientError` do package/cache/toolchain chưa có trong core dir đó, không phải lỗi source firmware.
- Build defect trong source: `platformio.ini` thêm `build_unflags = -std=gnu++11` để cờ C++17 không bị cờ mặc định C++11 ghi đè; `main.cpp` bổ sung forward declaration `subscribeToCommands()` trước khi dùng.
- PlatformIO `run` compile-only: **exit 0 / SUCCESS**. RAM 52,512/327,680 (16%); Flash 919,853/1,310,720 (70.2%). QA độc lập chạy lại cùng build, thành công.
- Không chạy `upload`, không flash, không kết nối broker. Source hiện tại không kích hoạt relay/bơm và command handler fail-closed/ACK Failed; chưa biết firmware thật trên ESP32 có khớp repository hay không.
- Native parser test `telemetry/tests/command_protocol_tests.cpp` chưa chạy vì không có `cl`, `g++`, `clang++`, `c++`, `gcc` trong PATH. NVS persistence/replay và hành vi trên thiết bị chưa xác minh bằng hardware.

Các thay đổi source firmware trong phase này: `firmware/esp32-controller/telemetry/platformio.ini`, `telemetry/src/main.cpp`, `telemetry/README.md`, và README firmware cấp trên để sửa hướng dẫn build cũ.

## 4. SQL lease integration results

Thêm `backend/SmartFarm.UnitTests/Integration/MqttCommandLeaseSqlServerIntegrationTests.cs`, opt-in bằng `SMARTFARM_SQL_LEASE_TESTS=1`. Fixture tạo DB LocalDB duy nhất mỗi lần chạy, giữ lại DB và không tự drop.

Tám kịch bản thực thi trên SQL Server LocalDB qua `DeviceCommandRepository.TryAcquireDispatchLeaseAsync`/`DeviceCommandService` thật:

1. Hai repository/context cạnh tranh một command: chỉ một claim thắng.
2. API service ghi command Pending, không publish.
3. Crash sau claim: lease chặn instance khác; lease hết thì recovery claim được.
4. Publish outcome mơ hồ: lease được giữ, retry dùng cùng command ID.
5. Late ACK: xóa lease và command không claim lại được.
6. Retry attempt limit.
7. Command expired không claim được.
8. Stale heartbeat không claim được.

Developer run: 8/8 PASS trên `SmartFarmLeaseIT_8f4cdb428c4847e2a95dac1665dd34e0`; TRX `.ai/phase2-lease-test-results/phase2-lease-integration-final.trx`. Opt-out: 8 skipped/0 failed, không tạo DB; TRX `.ai/phase2-lease-test-results/phase2-lease-optout.trx`.

QA độc lập: 8/8 PASS trên DB mới `SmartFarmLeaseIT_11e4273a16e54ca38abb3d46a7bf2b11`; TRX `.ai/phase2-qa-results/phase2-lease-independent-qa.trx`. Opt-out cũng 8 skipped, không tạo DB; TRX `.ai/phase2-qa-results/phase2-lease-independent-optout.trx`.

Giới hạn: competing instances được đại diện bằng context/repository instances riêng trong cùng test process, không phải hai tiến trình WebAPI độc lập. Không dùng fake publisher để phát message trong các SQL repository tests và không tiếp xúc broker; test “ambiguous publish” kiểm tra lease retained/reclaim sau thời hạn chứ không mô phỏng packet-level broker ACK. Crash sau publish, reconnect và MQTT QoS duplicate chưa được xác minh end-to-end qua broker.

Lưu ý DB test: lần chạy SQL integration đầu tiên do fixture per-test đã tạo 8 database riêng; sau sửa fixture các lần chạy tạo một DB/lượt. Tổng cộng có **15 database SQL lease test** được giữ nguyên (10 từ lượt ban đầu/fixture agent và 5 database từ các lần coordinator/QA chạy sau), không drop/xóa. Mỗi lượt có tên duy nhất được ghi trong TRX dưới `.ai/phase2-lease-test-results/` và `.ai/phase2-qa-results/`. Test opt-out không tạo DB. Không database nào trong số này là `SmartFarmMiniDb`.

## 5. Auth & Device Browser E2E

Môi trường cô lập dùng `SmartFarmMini_Phase2_20261125`, backend riêng với `Mqtt__Enabled=false`, frontend `127.0.0.1:5173`, backend `127.0.0.1:5205`. `/health/ready` trả HTTP 200 (database Ready, MQTT Disabled); chỉ backend port 5205 được bind, broker port 1883 không lắng nghe. Browser MCP được mở trong tab mới.

**Kết quả hiện đã có:** Register tại `/register` trả `POST /api/Auth/register` HTTP 200; dashboard mở, hub negotiate và dashboard API trả 200. Chưa đánh PASS toàn bộ flow cho đến khi có bằng chứng Add Device, refresh/persistence, logout rồi login lại. Kết quả từng bước sau sẽ được cập nhật ở đây trước khi bàn giao.

**Kết quả luồng Auth/Device:** Register HTTP 200 → Add Device HTTP 201 → reload `/devices`, API danh sách HTTP 200 và thiết bị còn trong list → Logout HTTP 204 → Login HTTP 200, thiết bị vẫn còn. User thứ hai không nhìn thấy thiết bị của user thứ nhất; ownership khớp SQL. Sau flow đầu: users=5, devices=4, readings=7,827, commands=5, refresh tokens=30; không orphan owner, năm command Pending cũ vẫn nguyên. Đây là E2E thật qua Chrome Browser MCP, nhưng chỉ trên clone.

Evidence trình duyệt gồm Browser MCP request/response IDs, Network và DOM snapshots; không lưu screenshot file.

Luồng đầu tiên phát hiện `/api/Dashboard/summary` trả HTTP 400 (request IDs 219/220 và sau login 242/243). Sau khi build WebAPI đúng source, lỗi IrrigationLog được khắc phục và lỗi tiếp theo lộ ra trong `SensorReadingRepository` với cùng query shape `GroupBy → SelectMany → OrderByDescending → Take`, không được SQL Server EF provider dịch. Cả hai repository đã đổi sang truy vấn bounded, sắp xếp theo timestamp/ID cho từng device ID duy nhất. Dashboard service vẫn chọn 5 log tưới mới nhất toàn cục như trước. Thêm SQL LocalDB regression tests cho cả hai repository, mỗi test dùng hai device, 7 records/device, device ID lặp và xác nhận limit/order. Cả hai query test đã PASS trong backend suite 177/177. Sau bản build chứa cả hai sửa, Browser MCP xác nhận tài khoản sở hữu thiết bị nhận `GET /api/Dashboard/summary` HTTP 200 (4 requests); response có `totalDevices=1`, `offlineDevices=1`, `isAnyPumpRunning=false` và danh sách irrigation/alerts rỗng.

Chromium cũng báo HTML `pattern` Device Code không hợp lệ vì dấu `-` trong Unicode-set (`v`) regex; đã escape dấu gạch ngang và thêm `noValidate` để form luôn chạy custom JS validation. Unit test xác nhận pattern v-mode compile được, mã hợp lệ/mã sai phân loại đúng; Browser MCP xác nhận `SF-NODE-01` tạo thành công (201), `BAD CODE` bị chặn và không gửi API request, không còn regex console error.

Google sign-in widget trả 403/FedCM do origin/client ID không được cho phép (có hard-coded client ID fallback); không chạy Google sign-in. Đây là **NOT VERIFIED**, độc lập với email/password flow.

Luồng bắt buộc: Register → Login → Add Device → Refresh → xác nhận device còn trong list và SQL clone → Logout → Login lại → xác nhận device vẫn tồn tại. Các tài khoản/device tạo ra chỉ thuộc clone; không xóa dữ liệu test.

## 6. Independent QA

QA độc lập đã chạy:

- Backend: `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore --disable-build-servers -m:1 --logger "trx;LogFileName=phase2-backend-independent-qa.trx" --results-directory .ai/phase2-qa-results` — **167 passed, 0 failed, 8 intentional skipped**, tổng 175; TRX `.ai/phase2-qa-results/phase2-backend-independent-qa.trx`.
- SQL integration enabled/disabled: kết quả 8/8 và 8 skipped như mục 4.
- Firmware compile-only: PASS, exit 0; không upload.
- Clone audit: độc lập xác nhận 7 history rows, columns/indexes, counts, fingerprint và trạng thái 5 lệnh trước khi E2E thêm dữ liệu.
- `git diff --check`: không whitespace errors; chỉ có cảnh báo line-ending CRLF của một số file đã sửa từ trước.

Sau khi phát hiện lỗi dashboard, coordinator chạy backend với opt-in SQL tests: **177 passed, 0 failed, 0 skipped**, gồm regression cho cả hai dashboard repositories trên `SmartFarmLeaseIT_0faa627a0e1b4437b93cc11b24102216`; TRX `.ai/phase2-qa-results/phase2-backend-dashboard-regressions.trx`. Frontend sau pattern/form fix: `npm test` **28/28 PASS**, `npm run build` typecheck/build **exit 0**; Vite cảnh báo chunk JS 597.71 kB vượt 500 kB.

QA chạy lại độc lập sau các sửa cuối: backend **177/177 PASS**, TRX `.ai/phase2-qa-results/phase2-backend-final-independent-qa.trx`; frontend **28/28 PASS**; build **PASS**. QA độc lập đọc clone sau E2E: users=5, devices=5, sensor readings=7,827, commands=5, refresh tokens=34; mọi device có owner hợp lệ; năm command gốc vẫn `Pending`, expiry 19-11-2026. QA xác nhận source/test diff cuối và review bằng chứng Browser MCP do Agent5 thu thập; QA không tự thao tác lại trên Chrome.

QA không đọc/ghi nghiệp vụ lên DB thật, không bật MQTT/broker hoặc tác động thiết bị. Browser E2E được thực hiện bởi Browser Agent; QA xác nhận độc lập database persistence/ownership nhưng không tự chạy lại Chrome flow.

## 7. Thay đổi source và artifact

Source được thêm/sửa trong Phase 2:

- `backend/SmartFarm.UnitTests/Integration/MqttCommandLeaseSqlServerIntegrationTests.cs` — SQL Server LocalDB repository integration tests, opt-in và giữ lại test DB.
- `backend/SmartFarm.Infrastructure/Persistence/Repositories/IrrigationLogRepository.cs`, `SensorReadingRepository.cs` — thay LINQ per-group shape không translate được bằng truy vấn bounded cho từng device.
- `frontend/smartfarm-web/src/pages/Devices/index.tsx`, `Devices.test.tsx` — sửa pattern HTML cho Chromium `v` regex và bảo đảm custom validation chạy trước khi gửi API.
- `firmware/esp32-controller/telemetry/platformio.ini` — hiệu chỉnh chuẩn C++17.
- `firmware/esp32-controller/telemetry/src/main.cpp` — forward declaration phục vụ compile.
- `firmware/esp32-controller/telemetry/README.md`, `firmware/esp32-controller/README.md` — ghi đúng trạng thái build/test/flash.

Artifact rehearsal/QA đáng chú ý: `.ai/SmartFarmMiniDb_Phase2_20261125.bak`, `.ai/Phase2_Rehearsal_Adoption_Apply.sql`, `.ai/Phase2_Rehearsal_Adoption_DryRun.sql`, `.ai/Phase2_Rehearsal_Postflight.sql`, `.ai/Phase2_Rehearsal_HistorySchema.sql`, `.ai/Phase2_Rehearsal_SchemaFingerprint.txt`, `.ai/phase2-lease-test-results/`, `.ai/phase2-qa-results/`.

Worktree có nhiều thay đổi chưa commit từ trước Phase 2; không có commit, push hoặc merge. Không được diễn giải toàn bộ `git status` là thay đổi do Phase 2.

## 8. Remaining blockers and approvals

1. Chạy native firmware protocol tests khi có compiler tương thích; verify NVS behavior chỉ bằng host harness/mock nếu có thể.
2. Hai WebAPI process độc lập và packet-level MQTT duplicate/reconnect/lost-ACK chưa được kiểm thử với isolated broker.
3. Firmware đang chạy trên ESP32 chưa được nhận diện; không thể khẳng định phần cứng tương thích với command protocol repository.
4. Năm Pending START_PUMP quá hạn cần kế hoạch xử lý rõ ràng trước bất kỳ lần bật dispatcher/MQTT sau này; phase này giữ nguyên trạng thái.
5. Production adoption/migration script cần cập nhật lineage 7 migration records, review và rehearsal lại; mọi ghi DB thật cần phê duyệt thực thi riêng.
6. Dashboard đọc một query SQL mỗi thiết bị để giữ đúng limit-per-device; theo dõi số thiết bị và tối ưu nếu vườn lớn.

## 9. GO / NO-GO

### Database deployment

**NO-GO cho ghi lên `SmartFarmMiniDb`.** Chỉ có rehearsal clone. Cần cập nhật và QA deployment plan/script cho đủ bảy migrations, review backfill expiry/5 lệnh Pending, xác nhận thời điểm maintenance và có lệnh phê duyệt thực thi riêng trước bất kỳ thao tác ghi nào.

### MQTT / hardware

**NO-GO cho khởi động dispatcher với broker thật hoặc điều khiển phần cứng.** Chưa thử broker isolated ở packet level, chưa xác minh firmware vật lý; protocol host tests chưa chạy. Không có lệnh nào được publish trong Phase 2.

## 10. Process boundaries

Không có commit/push/merge. Không khởi động broker. Không gửi MQTT commands. Không flash ESP32. `SmartFarmMiniDb` schema, migration history, dữ liệu và năm command Pending không bị thay đổi. Backend/frontend E2E chỉ được chạy trên clone; Agent5 đã dừng tiến trình và đóng tab do mình mở, các cổng 5173/5205/1883 không còn listener.
