# Báo cáo hoàn tất chiến lược EF Core Migration

**Dự án:** Smart Farm Mini  
**Nhánh:** `feature/iot-end-to-end-integration`  
**Ngày:** 24-11-2026  
**Phạm vi:** Hoàn thiện chuỗi migration cho database trống và quy trình tiếp nhận database theo SQL lineage hiện tại. `SmartFarmMiniDb` không được dùng làm đích migration, adoption hay kiểm thử ghi.

## 1. Quyết định kiến trúc

Schema chuẩn là schema hiện tại của `SmartFarmDbContext` và `SmartFarmDbContextModelSnapshot`, triển khai bằng chuỗi migration EF Core tuần tự. Migration khởi tạo `20261105051702_InitialCreate_v2` vẫn tạo đầy đủ schema cho database mới; không thay bằng migration baseline rỗng hoặc migration chỉ xác minh schema.

Database đã được tạo bằng các script SQL lịch sử không được chạy lại migration đầu. Quy trình riêng trong `database/scripts/05_AdoptSqlLineageDatabase.sql` chỉ tiếp nhận một database history-free nếu preflight xác nhận catalog đã khớp schema đích. Script không sửa bảng nghiệp vụ hoặc dữ liệu. Mặc định là dry-run (`@ApplyAdoption = 0`); khi bật, script chỉ tạo/điền `dbo.__EFMigrationsHistory` sau khi toàn bộ preflight thành công. Đây là adoption có kiểm tra, không phải schema repair.

Artifact hiện tại chủ động từ chối database tên `SmartFarmMiniDb`. Muốn triển khai lên DB thật cần một bản triển khai được review riêng sau phê duyệt rõ ràng; không đổi guard hoặc chạy script này trên DB thật trong giai đoạn này.

## 2. Migration lineage chuẩn

| Migration | Mục đích |
|---|---|
| `20261105051702_InitialCreate_v2` | Tạo schema đầy đủ cho database trống, gồm bảng, FK, index và Identity cơ bản. |
| `20261113150000_SensorReadingCompatibilityFix` | Bổ sung `SensorReadings.MessageId`, tính duy nhất theo message/type, check thời gian và quy tắc FK lịch sử. |
| `20261122120000_AddGoogleAuthColumns` | Bổ sung cột Google auth và index lọc duy nhất. Câu lệnh cập nhật/index phụ thuộc cột được chạy động sau kiểm tra cột. |
| `20261124120256_CanonicalSchemaAlignment` | Bổ sung soft-delete, constraints còn thiếu và quy tắc FK/index phù hợp với model. `Down` giữ lại cột tombstone. |
| `20261124120435_IdentityKeyAndSoftDeleteIndex` | Chuẩn hóa Identity key/token về 128 ký tự sau preflight chặn dữ liệu quá dài; thêm index soft-delete. |
| `20261124121439_RefreshTokenExpiryInvariant` | Thêm check `ExpiresAtUtc > CreatedAtUtc`. |

`SmartFarmDbContext` đã ánh xạ độ dài Identity key/token; `DeviceConfiguration` ánh xạ index soft-delete; `RefreshTokenConfiguration` ánh xạ check refresh token. Snapshot được cập nhật theo model. `dotnet ef migrations has-pending-model-changes` trả về **No changes have been made to the model since the last migration**.

## 3. Thay đổi source và script

- `backend/SmartFarm.Infrastructure/Persistence/Data/SmartFarmDbContext.cs`: giới hạn `LoginProvider`, `ProviderKey`, `Name` theo schema cuối.
- `backend/SmartFarm.Infrastructure/Persistence/Configurations/DeviceConfiguration.cs`: khai báo index `IsDeleted`.
- `backend/SmartFarm.Infrastructure/Persistence/Configurations/RefreshTokenConfiguration.cs`: khai báo check `CK_RefreshTokens_Expiry`.
- `backend/SmartFarm.Infrastructure/Persistence/Migrations/20261122120000_AddGoogleAuthColumns.cs`: chạy động các câu SQL phụ thuộc cột Google auth vừa tạo.
- Ba migration mới và designer files: canonical alignment, Identity key/index, refresh-token invariant.
- `backend/SmartFarm.UnitTests/Persistence/DatabaseRemediationTests.cs`: kiểm tra migration operations, preflight chiều dài Identity và bất biến model.
- `database/scripts/05_AdoptSqlLineageDatabase.sql`: preflight/adoption kiểm soát, fingerprint schema, history-free guard và bảo vệ tên DB thật.
- `.ai/SchemaFingerprint.sql`: công cụ so sánh catalog chỉ đọc.

Không thay đổi connection string mặc định, firmware, cấu hình MQTT hay dữ liệu database thật.

## 4. Kiểm thử database trống

QA tạo database disposable `SmartFarmMini_QA_Bootstrap_20261124_6A91` (LocalDB); database được giữ lại sau kiểm thử.

| Kiểm tra | Kết quả |
|---|---|
| Chạy EF migrations từ DB trống | PASS — cả 6 migration được áp dụng tuần tự. |
| Schema | PASS — 13 bảng nghiệp vụ cộng `dbo.__EFMigrationsHistory`. |
| Migration history | PASS — đủ 6 migration IDs nêu trên. |
| Identity login key | PASS — `AspNetUserLogins.LoginProvider` là `nvarchar(128)` (`max_length=256` bytes). |
| DeviceCode uniqueness | PASS — unique key/index không lọc. |
| Check constraints | PASS — 13 check constraints trên schema tạo mới. |
| Fingerprint schema chuẩn hóa | PASS — sau khi cập nhật helper để bao gồm computed/generated metadata, clean bootstrap có fingerprint `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`. |
| EF model drift | PASS — không có thay đổi model chưa được migration ghi nhận. |

Chạy migration thật trên database disposable; không dùng `EnsureCreated`.

## 5. Database theo SQL lineage và bảo toàn dữ liệu

Một backup `COPY_ONLY, CHECKSUM` được tạo và xác minh bằng `RESTORE VERIFYONLY`; backup được restore thành database riêng, MDF/LDF riêng. Các database và backup diễn tập được giữ nguyên, không xóa.

Bản restore QA `SmartFarmMini_QA_Reconcile_20261124_B72F` trước adoption có 3 users, 3 devices, 7.827 sensor readings, 5 commands và 26 refresh tokens; chưa có bảng EF history. `DBCC CHECKCONSTRAINTS` sạch, không có trùng `DeviceCode` hoặc `GoogleSubjectId`. So sánh hai chiều xác nhận user IDs và các cặp `(DeviceId, DeviceCode)` khớp backup.

QA độc lập bắt được lỗi của bản script đầu: fingerprint không khớp và bảng nhận kết quả DBCC khai báo sai số cột. Lần đó script fail closed; không tạo migration history. Sau khi sửa, coordinator chạy dry-run và QA độc lập chạy lại:

| Bước | Kết quả |
|---|---|
| Preflight `@ApplyAdoption=0` | PASS — `PREFLIGHT_PASS_NO_CHANGES`; fingerprint `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`. |
| Apply trên bản sao QA | PASS — trả về `ADOPTED`, cùng fingerprint, đúng 6 migration IDs và ProductVersion `10.0.13`. |
| Số bản ghi trước/sau | PASS — không đổi: users=3, devices=3, readings=7.827, commands=5, refresh tokens=26. |
| EF update sau adoption | PASS — “No migrations were applied. The database is already up to date.” |
| Fingerprint sau adoption | PASS — không đổi; 197 catalog parts và hash `C29B18EA…C4248275`. |
| Identity guard âm | PASS — trên DB riêng `SmartFarmMini_QA_Guard_20261124_C3D8`, giá trị LoginProvider dài 129 ký tự làm migration dừng với SQL 51101 trước alter; bản ghi vẫn còn, cột 900 bytes, PK còn nguyên, index soft-delete chưa tạo, history vẫn 4 migration. |

## 6. So sánh schema và giới hạn tương đương

Schema clean bootstrap và restored SQL-lineage copy có cùng fingerprint chuẩn hóa mới: `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`.

Phép so sánh bao gồm bảng, cột/kiểu/nullability/identity/computed/generated, index keys/uniqueness/filter, PK/FK/check definitions và trạng thái constraint. Các khác biệt catalog sau được cho phép có chủ đích và không bị tuyên bố là byte-for-byte giống nhau:

1. `UQ_Devices_DeviceCode` (unique constraint của SQL lineage) và unique index EF trên `DeviceCode` cùng đảm bảo duy nhất. Preflight yêu cầu đúng một unique key đơn cột không lọc đang bật, và từ chối candidate disabled/hypothetical.
2. Chiều index khác ở sáu key: `Alerts.IX_Alerts_DeviceId_IsResolved_Created(CreatedAtUtc DESC)`, `IrrigationLogs.IX_IrrigLogs_DeviceId_StartedAt(StartedAtUtc DESC)`, `SensorReadings.IX_SensorReadings_DeviceId_RecordedAt(RecordedAtUtc DESC)`, `SensorReadings.IX_SensorReadings_SensorType_RecordedAt(RecordedAtUtc DESC)`, `SystemLogs.IX_SysLogs_DeviceId_CreatedAt(CreatedAtUtc DESC)` và `SystemLogs.IX_SysLogs_Level_CreatedAt(CreatedAtUtc DESC)` ở SQL-lineage copy so với ASC trong clean bootstrap. Direction được chuẩn hóa khỏi fingerprint nhưng có thể ảnh hưởng kế hoạch truy vấn/hiệu năng.
3. `IX_Devices_IsDeleted` ở SQL lineage có thêm INCLUDE columns; index mới trong EF không có chúng. Tính duy nhất và kết quả truy vấn không đổi, nhưng kích thước index và hiệu năng đọc có thể khác.
4. SQL lineage có 15 default constraints legacy bổ sung ngoài bảy default được ánh xạ trong model EF: các cột `Id` của Alerts, AspNetUsers, DeviceCommands, Devices, IrrigationLogs, IrrigationRules, RefreshTokens, SensorReadingAggregates, SensorReadings, SystemLogs; cùng `AspNetUsers.EmailConfirmed`, `PhoneNumberConfirmed`, `TwoFactorEnabled`, `LockoutEnabled` và `AccessFailedCount`. Preflight xác minh bảy default bắt buộc; không xóa default dư. Fingerprint không băm mọi default dư nên kết quả thể hiện tương thích với hợp đồng EF đã kiểm tra, không phải catalog identity tuyệt đối.

Nếu có client SQL ngoài EF phụ thuộc các default hoặc kế hoạch truy vấn, cần đánh giá riêng trước khi triển khai.

## 7. Build, unit tests và QA độc lập

| Hạng mục | Kết quả |
|---|---|
| Backend build của coordinator | PASS — 0 warning, 0 error. |
| Backend unit tests của coordinator | PASS — 159/159. |
| Backend smoke/integration của coordinator | PASS trên disposable `SmartFarmMini_Bootstrap_20261124_9C7F2A`: `/health/ready`, đăng ký/đăng nhập, `/api/Auth/me`, POST device không token trả 401, POST có token lưu device với owner đang đăng nhập, user thứ hai nhận 403 khi đọc thiết bị. MQTT bị tắt bằng process-only setting; không dùng broker. |
| Build QA độc lập | PASS — 0 warning, 0 error. |
| Unit tests QA độc lập | PASS — 159/159. |
| Clean bootstrap QA độc lập | PASS — 13 bảng nghiệp vụ, history đủ 6 IDs, schema/hash đúng. |
| Existing DB reconciliation QA | PASS — dry-run, adoption, bảo toàn counts, fingerprint và EF no-op. |
| Identity length guard QA | PASS — giá trị 129 ký tự không bị cắt; lỗi xảy ra trước thay đổi schema. |
| EF model drift | PASS — không còn pending changes. Cảnh báo còn lại: EF báo `DeviceCommand.Status` có DB default nhưng chưa cấu hình sentinel. |
| API/OAuth/MQTT/phần cứng của QA độc lập | API/OAuth/MQTT/phần cứng không được QA chạy lại độc lập. API smoke nêu trên chạy bởi coordinator trên DB disposable; Google OAuth ngoài, broker và thiết bị vật lý không được dùng. |

## 8. Database thật không bị thay đổi

QA chỉ đọc `SmartFarmMiniDb`: ONLINE; 3 users, 3 devices, 7.827 readings, 5 commands, 26 refresh tokens; `dbo.__EFMigrationsHistory` vẫn không tồn tại. User IDs và cặp `(DeviceId, DeviceCode)` khớp hai chiều với bản backup đã restore. Không chạy migration, adoption, DDL hay DML lên database thật; không đổi connection string.

## 9. Rollback và triển khai sau này

Không dùng `Down` để rollback về đầu. `InitialCreate_v2.Down` xóa bảng; `SensorReadingCompatibilityFix.Down` xóa `MessageId`; các migration khác có thể bỏ constraints/index hoặc đổi hành vi FK. Migration thu hẹp Identity có preflight `DATALENGTH` và dừng trước alter nếu dữ liệu vượt 128 ký tự.

Nếu được phê duyệt triển khai sau này:

1. Lên lịch bảo trì và dừng API/MQTT writers để tránh ghi song song; không phát lệnh phần cứng.
2. Tạo backup mới, chạy `RESTORE VERIFYONLY`, xác nhận server/DB/backup và counts.
3. Review một artifact adoption riêng có target guard được thiết kế cho môi trường đích; chạy dry-run trên bản restore tương ứng, xác nhận fingerprint, constraints và counts.
4. Sau phê duyệt riêng, tạo migration history trong transaction; không replay migration đầu trên schema đã có.
5. Chạy `dotnet ef database update` (dự kiến no-op), xác nhận migration list, `/health/ready`, test ứng dụng và dữ liệu.
6. Nếu thất bại, dừng writers và restore vào DB riêng từ backup xác minh; xem xét các ghi phát sinh sau backup trước khi cutover. Cần phê duyệt riêng cho mọi restore/cutover.

Rehearsal không cần dọn dẹp; các database và file test giữ lại. **Chưa có thao tác nào lên `SmartFarmMiniDb`; cần phê duyệt riêng trước khi triển khai.**
