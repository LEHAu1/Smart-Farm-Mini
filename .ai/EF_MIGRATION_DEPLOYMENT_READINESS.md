# EF Core Migration Deployment Readiness

**Dự án:** Smart Farm Mini  
**Nhánh hiện tại:** `feature/iot-end-to-end-integration`  
**SQL Server:** `(localdb)\MSSQLLocalDB`  
**Database đích:** `SmartFarmMiniDb`  
**Ngày:** 24-11-2026  
**Phạm vi:** Chuẩn bị deployment script, tạo backup mới và rehearsal trên database bản sao. Không ghi lên database đích.

## 1. Kết luận điều hành

**GO cho chuẩn bị; NO-GO cho thao tác ghi hiện tại.** Script adoption đã được diễn tập trên bản restore mới: dry-run, lần apply đầu, chạy lại kiểu no-op, EF migration list và `dotnet ef database update` no-op đều thành công. Backup mới xác minh được; QA độc lập xác nhận hậu kiểm. Phiên bản script hiện tại có target guard khóa thêm file MDF/LDF; dry-run chính phiên bản này trên DB thật trả `PREFLIGHT_PASS_NO_CHANGES`.

`SmartFarmMiniDb` chỉ được đọc. Bảng `dbo.__EFMigrationsHistory` vẫn chưa tồn tại. Phê duyệt hiện tại cho phép chuẩn bị, không cho phép ghi. Cần xác nhận maintenance window và ra lệnh thực thi riêng trước mọi DDL/DML trên DB thật. Telemetry ingestion trên máy này hiện đã dừng; việc bật lại MQTT bị chặn bởi năm command Pending và một thiết bị stale đang mang `IsOnline=1`.

## 2. Review migration, DbContext và ModelSnapshot

### Model/snapshot

- `SmartFarmDbContext` giới hạn Identity composite-key strings (`LoginProvider`, `ProviderKey`, `Name`) còn 128 ký tự.
- `DeviceConfiguration` khai báo index `IX_Devices_IsDeleted`; soft-delete query filter giữ nguyên.
- `RefreshTokenConfiguration` khai báo check `CK_RefreshTokens_Expiry` (`ExpiresAtUtc > CreatedAtUtc`).
- `SmartFarmDbContextModelSnapshot` đồng bộ với model hiện tại.

### Sáu migration

| Migration | Tác dụng và lưu ý |
|---|---|
| `20261105051702_InitialCreate_v2` | Tạo đầy đủ schema cho database trống. `Down` xóa toàn bộ bảng, không dùng để rollback dữ liệu thật. |
| `20261113150000_SensorReadingCompatibilityFix` | Bổ sung MessageId/idempotency, FK và check timestamp. `Down` làm mất MessageId. |
| `20261122120000_AddGoogleAuthColumns` | Thêm Google auth có guard; SQL phụ thuộc cột chạy động sau khi cột được thêm. |
| `20261124120256_CanonicalSchemaAlignment` | Soft-delete, constraints/indexes còn thiếu và FK lịch sử NO ACTION. `Down` giữ tombstones nhưng đổi một số FK/constraints/indexes. |
| `20261124120435_IdentityKeyAndSoftDeleteIndex` | Kiểm tra `DATALENGTH > 256` trước khi thu hẹp bốn Identity columns từ `nvarchar(450)` xuống `nvarchar(128)`, rebuild hai PK rồi tạo soft-delete index. Lỗi preflight dừng trước thao tác alter/drop key. |
| `20261124121439_RefreshTokenExpiryInvariant` | Thêm check thời hạn refresh token. |

Diff reviewer không tìm thấy blocker còn lại trong migration/script. Cảnh báo EF vẫn còn: `DeviceCommand.Status` có DB default nhưng chưa cấu hình sentinel; không gây model drift.

## 3. Preconditions trên database đích — truy vấn read-only

| Kiểm tra | Kết quả |
|---|---|
| Windows identity | `laptop-ukv16e8v\lenovo`. |
| SQL identity | Machine `LAPTOP-UKV16E8V`, EngineEdition `4`, InstanceName dạng `LOCALDB#...`. `@@SERVERNAME` đổi suffix khi LocalDB khởi động lại nên không dùng làm guard ổn định. |
| Database files | MDF `C:\Users\Lenovo\SmartFarmMiniDb.mdf`; LDF `C:\Users\Lenovo\SmartFarmMiniDb_log.ldf`. |
| Database | `SmartFarmMiniDb`, ONLINE, MULTI_USER, compatibility 170. |
| Migration history | `OBJECT_ID(dbo.__EFMigrationsHistory)=NULL`. |
| Identity columns | Bốn key columns là `nvarchar(128)`, `max_length=256` bytes, NOT NULL. Login/token tables hiện không có row, nên không có giá trị hiện hữu vượt giới hạn. |
| DeviceCode | Không có duplicate groups; unique, unfiltered, enabled, non-hypothetical single-key constraint `UQ_Devices_DeviceCode`. |
| Foreign keys | 12, tất cả enabled/trusted. Identity/RefreshTokens dùng CASCADE; device history dùng NO ACTION; SystemLogs dùng SET NULL. |
| Check constraints | 13, tất cả enabled/trusted; gồm `CK_RefreshTokens_Expiry` và irrigation max duration `>0 AND <=300`. |
| Counts tại snapshot | users=3, devices=3, readings=7.827, commands=5, refresh tokens=26. Counts có thể đổi do telemetry writer. |
| Command queue | 5 commands `Pending`; `FARM-ESP32-003` có `IsOnline=1`, `IsActive=1`, `IsDeleted=0`, last-seen `2026-11-23 07:56:11 UTC`. |

## 4. Backup và bản rehearsal mới

Backup mới: `.ai/SmartFarmMiniDb_DeploymentPrep_20261124_01.bak`.

Đã chạy:

```sql
BACKUP DATABASE [SmartFarmMiniDb]
TO DISK = N'D:\GitHub\Smart Farm mini\Smart-Farm-Mini\.ai\SmartFarmMiniDb_DeploymentPrep_20261124_01.bak'
WITH COPY_ONLY, CHECKSUM, STATS = 10;
```

Backup hoàn tất 1.082 pages. `RESTORE VERIFYONLY ... WITH CHECKSUM` trả **The backup set on file 1 is valid**. `RESTORE FILELISTONLY` xác nhận logical files `SmartFarmMiniDb` và `SmartFarmMiniDb_log`.

Đây là backup phục vụ rehearsal ngày 24-11-2026, không thay thế backup mới phải tạo trong maintenance window đã được người dùng xác nhận. Chưa tạo backup cho cửa sổ đề xuất; thao tác đó chỉ được thực hiện sau khi cửa sổ được xác nhận và có lệnh thực thi cuối cùng.

Restore mới thành `SmartFarmMini_DeployRehearsal_20261124_01`; MDF/LDF đặt riêng tại:

- `.ai/SmartFarmMini_DeployRehearsal_20261124_01.mdf`
- `.ai/SmartFarmMini_DeployRehearsal_20261124_01_log.ldf`

Tên DB/file đã được xác nhận chưa tồn tại trước restore. Không có database/file nào bị ghi đè hoặc xóa.

## 5. Deployment script và exact SQL write

Script chuẩn bị: `database/scripts/06_PrepareProductionMigrationHistoryAdoption.sql`.

Mặc định `@ApplyAdoption = 0` và `@ApprovalReference` rỗng. Guard xác nhận `DB_NAME()`, machine name, LocalDB EngineEdition/InstanceName family và chính xác MDF/LDF paths. Hash SHA-256 của file hiện tại là `C36659EAC4D2039A7485C3443959AD069FE53B2BFD6A3ED3B9FBC0024BCD6B7D`. Script yêu cầu schema/fingerprint phù hợp, history vắng hoặc khớp chính xác đủ sáu IDs/ProductVersion. Nếu history đã đầy đủ thì trả `ALREADY_ADOPTED_NO_CHANGES`; nếu thiếu/thừa/khác version thì fail closed. Khi apply, phải điền approval reference riêng.

Preflight gồm: 13 business tables/core tables; required defaults; duplicate DeviceCode/GoogleSubjectId; NULL AuthProvider; FK/check enabled/trusted; `DBCC CHECKCONSTRAINTS`; unique DeviceCode key duy nhất; normalized schema fingerprint; counts trước thao tác. Script dùng transaction `SERIALIZABLE`, transaction-owned application lock và `XACT_ABORT`; lỗi rollback.

Exact write lần đầu khi được phê duyệt: tạo bảng `dbo.__EFMigrationsHistory` với `MigrationId nvarchar(150)` primary key và `ProductVersion nvarchar(32)`, rồi chèn sáu migration IDs với `ProductVersion=10.0.13`:

- `20261105051702_InitialCreate_v2`
- `20261113150000_SensorReadingCompatibilityFix`
- `20261122120000_AddGoogleAuthColumns`
- `20261124120256_CanonicalSchemaAlignment`
- `20261124120435_IdentityKeyAndSoftDeleteIndex`
- `20261124121439_RefreshTokenExpiryInvariant`

Không có `ALTER TABLE` nghiệp vụ, backfill, DELETE/UPDATE hay `dotnet ef database update` lên database thật. Script chỉ đánh dấu lineage sau khi preflight chứng minh các hiệu ứng schema đã có.

## 6. Schema differences đã ghi nhận

Clean bootstrap và restored SQL lineage có cùng normalized fingerprint `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`, nhưng catalog không giống byte-for-byte:

1. `UQ_Devices_DeviceCode` là unique constraint ở SQL lineage; EF bootstrap dùng unique index. Cả hai enforce DeviceCode uniqueness.
2. Sáu key có DESC trong DB cũ so với ASC ở bootstrap: `Alerts.IX_Alerts_DeviceId_IsResolved_Created(CreatedAtUtc)`, `IrrigationLogs.IX_IrrigLogs_DeviceId_StartedAt(StartedAtUtc)`, hai index `SensorReadings` kết thúc bằng `RecordedAtUtc`, và hai index `SystemLogs` kết thúc bằng `CreatedAtUtc`. Direction được chuẩn hóa khỏi fingerprint, nhưng có thể ảnh hưởng query plan/hiệu năng.
3. `IX_Devices_IsDeleted` hiện có INCLUDE `OwnerId, DeviceCode, Name, IsActive, IsOnline`; index EF bootstrap không có INCLUDEs. Kết quả/trạng thái uniqueness không đổi nhưng coverage, dung lượng và hiệu năng có thể khác.
4. Có 22 default constraints legacy so với 7 defaults được ánh xạ trong model (15 default dư, gồm các `Id` và Identity flags/counters). Script kiểm tra bảy defaults model-required, không xóa defaults dư. Client SQL ngoài EF cần được đánh giá nếu phụ thuộc chúng.

## 7. Rehearsal trên bản restore mới

| Chỉ số | Trước | Sau apply + rerun |
|---|---:|---:|
| Users | 3 | 3 |
| Devices | 3 | 3 |
| SensorReadings | 7.827 | 7.827 |
| DeviceCommands | 5 | 5 |
| RefreshTokens | 26 | 26 |

- Trước thử: ONLINE, không history, 12 FK/13 checks không lỗi, Identity columns 256 bytes, DBCC sạch.
- Dry-run: `PREFLIGHT_PASS_NO_CHANGES`, không tạo history; fingerprint `C29B18EA...C4248275`.
- Apply trên copy tạm đã đổi target literal: `ADOPTED`, đủ sáu IDs, ProductVersion 10.0.13, cùng hash.
- Chạy lại apply: `ALREADY_ADOPTED_NO_CHANGES`, không duplicate rows.
- `dotnet ef database update --connection` trỏ trực tiếp clone: exit 0, “No migrations were applied. The database is already up to date.”
- `dotnet ef migrations list --connection` cho clone: cả sáu migrations applied.
- `dotnet ef migrations has-pending-model-changes`: no model drift.
- Build WebAPI: 0 warning/error; unit tests: 159/159.

## 8. Concurrent telemetry và thời điểm đề xuất

Backup online là recovery point nhất quán; row counts là snapshot theo thời điểm. Adoption dùng SERIALIZABLE và DBCC nên có thể giữ locks/chặn writers. Application lock chỉ phối hợp với client dùng cùng resource; nó không tự dừng API/MQTT.

### Trạng thái ingestion và pause/resume an toàn

Tại lần kiểm tra mới nhất: không có process `dotnet` WebAPI, không có Mosquitto process/service, không có listener cổng 1883; `Mqtt:Enabled` đang false trong appsettings hiện hành. Do đó trên máy LocalDB này hiện không có ingestion đang chạy để pause.

Không khởi động lại backend/MQTT trong hoặc sau cửa sổ. `MqttHostedService` kết nối broker rồi gọi dispatch pending commands; hiện có 5 lệnh Pending và một thiết bị stale nhưng `IsOnline=1`. Start service với MQTT enabled có thể publish lệnh tới thiết bị. Cấu hình hiện tại không có chế độ chỉ bật telemetry nhưng khóa command dispatch. Vì vậy chưa có quy trình resume MQTT an toàn trong phạm vi chỉ-ghi-history; giữ backend/MQTT dừng sau khi adoption, cho đến khi queue được review riêng và có hướng dẫn/phê duyệt rõ ràng. Không thay đổi hay gửi các command đó trong giai đoạn này.

### Maintenance window đề xuất

Maintenance window **25-11-2026, 23:00–23:30 (Asia/Ho_Chi_Minh)** đã được người dùng xác nhận lịch; đây chưa phải lệnh thực thi. Backend/MQTT phải giữ dừng; nếu tại thời điểm đó có process, broker listener hoặc telemetry writer hoạt động thì hủy/hoãn cửa sổ, không tự stop process. Không dispatch năm commands Pending và không thay đổi `IsOnline`.

Trong cửa sổ, chỉ sau lệnh thực thi cuối cùng: tạo backup mới `COPY_ONLY, CHECKSUM`, chạy `RESTORE VERIFYONLY`, xác nhận server/database/MDF/LDF/counts; chạy script với `@ApplyAdoption=0`; nếu mọi điều kiện khớp mới đổi approval reference/flag và chạy apply theo lệnh cuối. Sau đó hậu kiểm history/fingerprint/counts/EF no-op. Nếu SHA-256 script thay đổi, yêu cầu QA review lại; nếu bất kỳ preflight nào thất bại thì dừng. Backend/MQTT không được khởi động lại sau adoption. Đây là kế hoạch, chưa thực hiện.

## 9. Rollback

Nếu script lỗi trước commit, transaction rollback; business schema/dữ liệu không đổi. Không xóa history để undo và không chạy migration `Down`: EF có thể replay InitialCreate, còn các `Down` khác có thể xóa MessageId hoặc đổi constraints/FK/index.

Nếu có vấn đề sau commit: dừng writers; không xóa history/không chạy Down; restore backup đã verify vào DB/file riêng; đối chiếu telemetry phát sinh sau backup và chỉ cutover sau phê duyệt riêng. Không restore đè tại chỗ trong quy trình chuẩn bị này.

## 10. QA độc lập

QA độc lập xác nhận:

- Backup `RESTORE VERIFYONLY WITH CHECKSUM`: PASS; FILELISTONLY đúng; clone dùng MDF/LDF riêng.
- Clone ONLINE, đủ sáu history IDs/ProductVersion 10.0.13; counts 3/3/7.827/5/26; Identity widths 256 bytes; 12/12 FK và 13/13 checks enabled/trusted; DeviceCode unique.
- Fingerprint 197 catalog parts: `C29B18EA5DC8D5EFBE06E4E1008CB2CAE325D4FD78C984F9F4AC84E6C4248275`.
- Build 0 warnings/0 errors; tests 159/159; EF no model drift (còn cảnh báo sentinel Status).
- Script chỉ ghi migration history, guard database/host/LocalDB/MDF/LDF, yêu cầu approval reference, và rerun là no-op.
- Live DB chỉ được đọc; vẫn ONLINE, history absent, counts và các preconditions như trước.
- Không chạy API server, MQTT hay phần cứng; không commit/push.
- Guard cuối đã được QA đọc lại; exact dry-run trên SmartFarmMiniDb trả `PREFLIGHT_PASS_NO_CHANGES`, fingerprint khớp.

## 11. Go/No-Go

**Chuẩn bị kỹ thuật: GO — QA độc lập PASS; script dry-run và preflight hiện tại đạt.**  
**Ghi lên `SmartFarmMiniDb`: NO-GO ở thời điểm hiện tại.**

Maintenance window **25-11-2026 23:00–23:30 ICT đã được xác nhận**. Trạng thái vẫn **NO-GO cho thao tác ghi** cho đến khi có lệnh thực thi cuối cùng. Telemetry phải tiếp tục dừng sau adoption; không bật MQTT khi còn 5 command Pending và thiết bị stale `IsOnline=1`. Không có thao tác nào ghi lên database thật trong lượt này.
