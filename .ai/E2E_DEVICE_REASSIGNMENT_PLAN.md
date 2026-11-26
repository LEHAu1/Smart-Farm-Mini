# Kế hoạch reassignment thiết bị E2E an toàn

Ngày lập: 26/11/2026 (Asia/Ho_Chi_Minh)  
Branch: `feature/iot-end-to-end-integration`  
**Trạng thái: CHỈ CHUẨN BỊ — chưa đăng ký target user, chưa chạy UPDATE reassignment.**

## 1. Kết quả database preflight (read-only)

Đã dùng `sqlcmd` với Windows Integrated Authentication trên LocalDB; chỉ chạy `SELECT`, không truy cập `SmartFarmMiniDb`.

| Kiểm tra | Kết quả |
|---|---|
| SQL Server instance | `LAPTOP-UKV16E8V\LOCALDB#EF965CAD` |
| `DB_NAME()` | `SmartFarmMini_E2E_20261125_9C4A` — khớp chính xác DB disposable được chỉ định |
| DeviceCode | `FARM-ESP32-001` xuất hiện đúng 1 hàng |
| DeviceId | `6816241C-4666-4B2B-B2DE-DA23796B4CC1` |
| OwnerId hiện tại | `05A9A1F0-0133-43B7-837E-FB8CA0F6B82D` |
| Owner email | `esp32-e2e-d8a1911bc57b464f811057731c600505@example.test` — khớp owner mong đợi |
| Trạng thái thiết bị | `IsActive=1` |
| SensorReadings tại preflight 04:22Z | Tổng 1.794; SensorType 2: 598, SensorType 3: 598, SensorType 5: 598 |
| Thời điểm snapshot đó | `2026-11-26T04:22:44.2043976Z` (11:22:44.204 +07:00) |

Lượt kiểm tra cuối sau khi hoàn tất QA tiếp tục xác nhận cùng Server/DB, đúng 1 device row, DeviceId/OwnerId/email và `IsActive=1` không đổi tại `2026-11-26T04:26:00.1556277Z`; lúc đó readings count là 1.851. 26 giây sau, truy vấn theo từng loại tại `2026-11-26T04:26:26.5718619Z` cho tổng 1.860 (SensorType 2/3/5: 620 mỗi loại). Đây là snapshot mới nhất được lưu trong báo cáo.

Số readings tăng giữa các truy vấn (1.698 → 1.752 → 1.794 → 1.851 → 1.860), nên DB đang nhận thêm dữ liệu trong lúc preflight. Owner/device identity không mismatch. Đây là bằng chứng phải dừng ingestion trong cửa sổ thực thi và chạy lại preflight ngay trước thao tác. Script khóa snapshot readings trong transaction và guard số lượng gần nhất; nếu count đã thay đổi, script dừng và rollback.

## 2. Owner hiện tại

Thiết bị đang thuộc đúng tài khoản E2E cũ theo email và OwnerId trong bảng trên. Không đăng nhập tài khoản này, không đặt lại mật khẩu, không thay đổi thiết bị và không cập nhật record bằng SQL/API trong bước chuẩn bị.

## 3. Đăng ký target account khi có phê duyệt riêng

API hiện hữu: `POST /api/Auth/register`, body gồm `userName`, `email`, `password`, `displayName`. Quy trình đề xuất:

1. Khởi động Backend E2E chỉ sau khi `/health/ready` xác nhận `databaseName=SmartFarmMini_E2E_20261125_9C4A`; nếu thiếu/sai DB name thì dừng.
2. Sinh email/username duy nhất với domain `example.test`; sinh mật khẩu ngẫu nhiên.
3. Lưu mật khẩu vào password manager/kho secret local trước khi gửi request. Không ghi credential/token vào source, shell history, log hoặc báo cáo. .NET User Secrets là lựa chọn local-only nhưng file secret được bảo vệ bởi user profile, không phải kho mã hóa chuyên dụng.
4. Gọi `POST /api/Auth/register`. Chỉ lấy `user.id` trong response; không in/log toàn bộ response vì có access/refresh token.
5. Xác minh ID bằng `GET /api/Auth/me` với access token giữ trong bộ nhớ tiến trình; đối chiếu `id` và email rồi bỏ token khỏi bộ nhớ khi xong.
6. Không coi đăng ký tài khoản là chuyển quyền thiết bị. Target ID/email chỉ được điền vào script sau khi account đã được tạo và xác minh.

**Target chưa được tạo** trong giai đoạn này. Password và token chưa được sinh hoặc lưu.

## 4. Script transaction đã chuẩn bị (chưa chạy)

File: [E2E_DEVICE_REASSIGNMENT_DO_NOT_EXECUTE.sql](D:/GitHub/Smart%20Farm%20mini/Smart-Farm-Mini/.ai/E2E_DEVICE_REASSIGNMENT_DO_NOT_EXECUTE.sql)

Script có các chốt sau:

- So khớp `DB_NAME()` chính xác; sai DB thì `THROW` trước transaction.
- Mặc định dừng vì `@TargetOwnerId`/`@ExpectedTargetEmail` để `NULL` cho tới khi target được đăng ký và phê duyệt.
- Kiểm tra DeviceCode đúng một hàng, DeviceId cụ thể, OwnerId và email chủ cũ, thiết bị active/chưa soft-delete.
- Kiểm tra tài khoản nhận đúng ID/email, `EmailConfirmed=1`, không bị lockout; không có thuộc tính `IsActive` riêng trong `AppUser`.
- Dùng transaction `SERIALIZABLE`, khóa thiết bị/tài khoản/readings và `XACT_ABORT ON`.
- Chỉ cập nhật `Devices.OwnerId` và `UpdatedAtUtc`, với điều kiện cả DeviceId, DeviceCode, OwnerId cũ, active và chưa soft-delete.
- Bắt buộc `@@ROWCOUNT=1`; mọi sai lệch ném lỗi và tự rollback.
- Chụp/so sánh toàn bộ các cột SensorReadings trước/sau bằng `EXCEPT` hai chiều, không chỉ so tổng count.
- Guard tổng count và count theo từng SensorType so với snapshot preflight; distribution thay đổi thì dừng và rollback.
- Kiểm tra DeviceCode/DeviceId/owner mới sau update. Before/after evidence được buffer và chỉ trả về sau COMMIT.
- Không đụng tới các bảng command, không gửi MQTT, không chứa Admin bypass.

Script hiện guard `SensorReadings=1860` và distribution `(2,620), (3,620), (5,620)` theo snapshot mới nhất lúc 04:26:26Z. Snapshot đầy đủ các hàng được lấy bên trong transaction ngay trước UPDATE; phép so sánh toàn bộ hàng xác nhận reassignment không làm đổi lịch sử trong transaction. Vì dữ liệu vẫn tăng, trước lần thực thi được phê duyệt phải dừng Backend ingestion, chạy lại preflight read-only và cập nhật cả tổng count lẫn distribution. Nếu điều kiện không khớp, script sẽ dừng; không được bỏ guard để “cho chạy qua”.

Đã chạy SQL Server `SET PARSEONLY ON` trên đúng DB disposable để kiểm tra cú pháp; **PARSEONLY=PASS**, script không được thực thi và không có ghi DB.

## 5. SQL integration tests

Đã chạy trên fixture LocalDB mới, tự sinh tên `SmartFarmLeaseIT_a961a465cd254604bb4aef88642b0889`, server `LAPTOP-UKV16E8V\LOCALDB#EF965CAD`. Không dùng DB E2E mục tiêu, `SmartFarmMiniDb`, WebAPI, MQTT hay phần cứng.

Kết quả từ process thật:

```text
Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration: 2 s
```

- `DeviceOwnershipTransfer_ConcurrentCompareAndSwapPreservesHistoryAndAccessScope`: PASS — hai context cùng thử chuyển, chỉ một compare-and-swap thành công; DeviceCode/DeviceId giữ nguyên, SensorReading hiện hữu còn nguyên, owner cũ không còn thấy thiết bị trong danh sách và owner thắng có thiết bị.
- `DeviceRepository_OnlyConfirmedAndUnlockedAccountsAreEligibleTransferTargets`: PASS — account xác nhận và không lockout được chấp nhận; missing/unconfirmed/locked bị từ chối.

TRX ghi `Passed=2, Failed=0, Skipped=0`, mỗi test có `outcome="Passed"`. Bằng chứng:

- [run.log](D:/GitHub/Smart%20Farm%20mini/Smart-Farm-Mini/.ai/e2e-ownership-sql-qa-20261126/run.log)
- [ownership-sql.trx](D:/GitHub/Smart%20Farm%20mini/Smart-Farm-Mini/.ai/e2e-ownership-sql-qa-20261126/ownership-sql.trx)
- [database-identity.txt](D:/GitHub/Smart%20Farm%20mini/Smart-Farm-Mini/.ai/e2e-ownership-sql-qa-20261126/database-identity.txt)

Controller/API unit tests bổ sung trước đó đạt **59/59**; test cũ nhận 403 và target nhận 200 sau khi OwnerId đổi trong response test.

## 6. Independent QA

QA độc lập xác minh database fixture test là `SmartFarmLeaseIT_a961a465cd254604bb4aef88642b0889`, review TRX 2/2 PASS và xác nhận không truy cập SmartFarmMiniDb/API/MQTT/hardware. QA review script không thực thi. Góp ý về owner email NULL, evidence sau COMMIT, per-type count guard và giới hạn rollback sau COMMIT đã được xử lý. **Final independent QA: PASS cho artifacts chuẩn bị**; script vẫn chưa chạy, target chưa tạo, reassignment vẫn NO-GO.

## 7. Điều kiện và quyền cần có trước khi thực thi

Không có quyền thực thi được cấp trong yêu cầu hiện tại. Cần phê duyệt riêng cho tất cả điều kiện sau:

1. Xác nhận target email và UserId thực tế sau khi tạo bằng registration API.
2. Phê duyệt rõ một lần `UPDATE OwnerId` cho `FARM-ESP32-001` trong đúng `SmartFarmMini_E2E_20261125_9C4A`, từ OwnerId cũ trong báo cáo sang target đã xác minh.
3. Xác nhận maintenance window, Backend E2E/telemetry ingestion đã dừng và preflight mới nhất vẫn khớp database/device/owner.
4. Tạo/xác minh backup mới của DB disposable và phê duyệt phương án rollback sau COMMIT. `ROLLBACK` tự động trong script chỉ xử lý lỗi trước COMMIT; sau COMMIT cần một thao tác đảo OwnerId có guard riêng được phê duyệt, hoặc restore backup đã xác minh (có thể làm mất các ghi mới sau backup). Chưa có script đảo chiều được chuẩn bị.
5. Phê duyệt chạy đúng file `E2E_DEVICE_REASSIGNMENT_DO_NOT_EXECUTE.sql` sau khi điền target ID/email và cập nhật reading-count guard từ preflight cuối.

Trước khi có các xác nhận trên, trạng thái là **NO-GO**. Không được chạy script qua `sqlcmd`, SSMS, ứng dụng, hay chỉnh OwnerId thủ công. Sau khi chạy được phê duyệt, hậu kiểm phải xác nhận một device row, target OwnerId/email, cùng DeviceId/DeviceCode và toàn bộ SensorReadings nguyên vẹn; nếu hậu kiểm thất bại sau COMMIT thì dừng Backend và chỉ thực hiện phương án rollback sau commit đã phê duyệt, không tiếp tục MQTT.

## 8. Phạm vi không thực hiện

- Không đăng ký target account trong giai đoạn chuẩn bị.
- Không chạy ownership reassignment SQL.
- Không sửa SmartFarmMiniDb hoặc dữ liệu nghiệp vụ của DB đó.
- Không thay đổi lệnh Pending, không bật dispatch, không khởi động broker/backend phục vụ thao tác này.
- Không publish MQTT, không điều khiển thiết bị, không commit/push/merge.
