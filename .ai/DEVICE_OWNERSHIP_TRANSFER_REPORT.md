# Báo cáo chuyển quyền sở hữu thiết bị

Ngày: 26/11/2026  
Branch: `feature/iot-end-to-end-integration`

## Tóm tắt

- **API chuyển quyền:** IMPLEMENTED.
- **Unit/API tests:** PASS — 59 passed, 0 failed, 0 skipped trong lần chạy mới nhất của tác giả.
- **SQL concurrency/history integration:** NOT VERIFIED — test được thêm nhưng VSTest testhost không bắt tay trong 90 giây; LocalDB registry cũng không truy cập được từ môi trường chạy hiện tại.
- **Tạo tài khoản E2E mới:** BLOCKED — không thể xác nhận DB đích từ môi trường hiện tại để ghi dữ liệu an toàn.
- **Chuyển `FARM-ESP32-001` hiện hữu:** BLOCKED — chưa có phiên đăng nhập hợp lệ của chủ hiện tại; không có mô hình admin được lưu trong Identity. Không có thao tác SQL/API nào được dùng để đổi chủ thiết bị này.
- **SmartFarmMiniDb, MQTT, ESP32:** không truy cập/ghi, không publish, không điều khiển.

## Thiết kế và phân quyền

Endpoint mới:

```http
POST /api/Devices/{id}/ownership-transfer
Authorization: Bearer <access-token>
Content-Type: application/json

{ "targetOwnerId": "<guid>" }
```

Chỉ người dùng đã xác thực mới gọi được endpoint. Server lấy người gọi từ claim `NameIdentifier`; không nhận `currentOwnerId` từ body. Dịch vụ bắt buộc người gọi là `OwnerId` đang lưu của thiết bị. Không có nhánh Admin: repository không có bảng role Identity và đăng ký công khai chỉ cấp vai trò User.

Tài khoản nhận được xem là đủ điều kiện khi tồn tại, đã xác nhận email và không bị lockout tại thời điểm kiểm tra. `AppUser` hiện không có thuộc tính `IsActive`, nên đây là chính sách khả dụng dựa trên các trường Identity hiện có; không thêm cột hoặc migration.

Kết quả HTTP:

- `200`: chuyển quyền thành công.
- `400`: TargetOwnerId không hợp lệ.
- `401`: chưa xác thực.
- `403`: người gọi không phải chủ hiện tại.
- `404`: thiết bị không có hoặc tài khoản nhận không tồn tại/không đủ điều kiện.
- `409`: chuyển cho chính chủ hiện tại hoặc yêu cầu cạnh tranh đã thắng trước.

## An toàn đồng thời và bảo toàn dữ liệu

Repository kiểm tra tài khoản nhận rồi cập nhật bằng một câu `UPDATE` có điều kiện cả `DeviceId` lẫn `OwnerId` hiện tại. Đây là compare-and-swap nguyên tử: hai yêu cầu từ cùng chủ cũ chỉ có thể có một yêu cầu cập nhật được một hàng. Khóa ngoại hiện hữu tiếp tục bảo đảm tài khoản nhận tồn tại tại thời điểm ghi.

Chỉ `OwnerId` và `UpdatedAtUtc` được cập nhật. `Device.Id`, `DeviceCode`, trạng thái thiết bị và các hàng SensorReadings/commands/logs không bị sửa. Đồng thời, `DeviceRepository.UpdateAsync` không còn đánh dấu mọi cột là Modified; điều đó tránh ghi đè OwnerId mới bằng một entity cũ đã được nạp trước lúc chuyển quyền.

## Thay đổi source

- `backend/SmartFarm.Application/DTOs/Device/TransferDeviceOwnershipRequest.cs` — request DTO.
- `backend/SmartFarm.Application/Contracts/Persistence/IDeviceRepository.cs` — kiểm tra tài khoản nhận và thao tác compare-and-swap.
- `backend/SmartFarm.Application/Contracts/Services/IDeviceService.cs` — hợp đồng use case.
- `backend/SmartFarm.Application/Services/DeviceService.cs` — kiểm tra chủ hiện tại, tài khoản nhận, cùng chủ và xung đột đồng thời.
- `backend/SmartFarm.Infrastructure/Persistence/Repositories/DeviceRepository.cs` — kiểm tra Identity và cập nhật có điều kiện; giữ property-level change tracking.
- `backend/SmartFarm.WebAPI/Controllers/DevicesController.cs` — endpoint có `[Authorize]` và ánh xạ lỗi HTTP.
- `backend/SmartFarm.UnitTests/Services/DeviceServiceTests.cs` — positive/negative/business conflict tests.
- `backend/SmartFarm.UnitTests/Controllers/BackendEndpointsTests.cs` — caller lấy từ principal, không bypass bằng Admin claim, quyền truy cập trước/sau chuyển.
- `backend/SmartFarm.UnitTests/Integration/MqttTelemetryReliabilitySqlIntegrationTests.cs` — test SQL opt-in cho hai yêu cầu chuyển đồng thời, tài khoản đủ điều kiện và lịch sử đọc cảm biến.

Các thay đổi trước đó trong worktree được giữ nguyên; không commit, push hoặc merge.

## Kết quả kiểm thử

| Kiểm thử | Trạng thái | Bằng chứng |
|---|---|---|
| DeviceService + BackendEndpoints tests | **PASS** | `dotnet test ... --filter "FullyQualifiedName~DeviceServiceTests\|FullyQualifiedName~BackendEndpointsTests"` — 59 passed, 0 failed, 0 skipped. Output được tách khỏi thư mục WebAPI đang bị khóa bởi process chạy ở port 5206. |
| Authorized transfer / identity and DeviceCode preservation | **PASS (unit)** | Service test xác nhận chỉ OwnerId response đổi, Device Id và DeviceCode giữ nguyên; repo CAS được gọi đúng với chủ hiện tại. |
| Unauthorized / missing device / missing or inactive target / same owner / race loser | **PASS (unit)** | Service/controller test cases; non-owner không truy vấn hoặc ghi tài khoản nhận. |
| Previous owner loses API access; new owner gains access | **PASS (controller unit)** | Controller kiểm tra `OwnerId` hiện tại: chủ cũ nhận 403, chủ mới nhận 200. |
| SQL concurrent transfer + historical reading persistence | **NOT VERIFIED** | Opt-in SQL test đã được thêm. Lần bật `SMARTFARM_SQL_LEASE_TESTS=1` bị VSTest timeout ở testhost sau 90 giây. Không có kết quả SQL để tuyên bố PASS. |
| Database isolation / account registration E2E | **BLOCKED** | `SqlLocalDB.exe info MSSQLLocalDB` báo không truy cập được cấu hình registry; không thể tự xác minh DB identity trong execution environment. Không ghi DB hoặc gọi Register API. |
| Independent QA | **PASS (unit/API scope)** | Sau thay đổi cuối cùng, QA độc lập chạy lại cùng filter trong output directory tách riêng: 59 passed, 0 failed, 0 skipped. QA xác nhận không truy cập DB/API/MQTT/hardware. SQL concurrency fixture vẫn NOT VERIFIED do timeout môi trường. |

### Lệnh xác minh đã chạy

```powershell
dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore `
  --filter "FullyQualifiedName~DeviceServiceTests|FullyQualifiedName~BackendEndpointsTests" `
  --logger "console;verbosity=minimal" `
  '-p:OutputPath=artifacts/ownership-final/$(MSBuildProjectName)/'
```

Test SQL opt-in đã thử trên fixture chỉ tạo database với tên ngẫu nhiên `SmartFarmLeaseIT_<guid>` và chỉ áp migration vào DB đó. VSTest không khởi tạo được testhost trong giới hạn 90 giây. Không có SQL write nào được xác nhận trong lần thử; testhost process đã thoát.

## Tài khoản E2E và thiết bị FARM-ESP32-001

Không thử khôi phục hoặc đặt lại mật khẩu chủ cũ. Không tạo tài khoản mới trong DB vì môi trường hiện tại không xác minh được danh tính database runtime, và tài khoản mới không thể sở hữu thiết bị nếu thiếu thao tác được chủ cũ ủy quyền. Không chuyển OwnerId trực tiếp bằng SQL.

Để hoàn tất kiểm thử thật trên dữ liệu E2E cần:

1. Backend E2E chạy với connection đã được xác minh là `SmartFarmMini_E2E_20261125_9C4A`.
2. Đăng ký tài khoản test qua `POST /api/Auth/register` và lưu credential test trong kho secret phù hợp, không ghi vào source/log.
3. Có access token hợp lệ của chủ hiện tại để gọi endpoint chuyển quyền; hoặc xin phê duyệt riêng một quy trình reset/reassignment chỉ trên bản E2E disposable sau backup/kiểm tra danh tính.
4. Sau chuyển, kiểm tra bằng API rằng chủ cũ bị 403, chủ mới đọc được thiết bị và DeviceCode/lịch sử SensorReadings không đổi.

## QA độc lập và giới hạn

QA review xác nhận endpoint không tin OwnerId do client khai báo cho người gọi, không có admin bypass, và compare-and-swap chỉ cho phép một lần chuyển thành công. QA chạy lại phiên bản cuối của các unit/API tests và xác nhận 59 pass, 0 fail, 0 skip. QA cũng xác nhận không thực hiện database, HTTP API, MQTT hay phần cứng.

Chưa xác minh bằng SQL Server thật trong test fixture các điều kiện unique DeviceCode, FK/history và hai-writer race. Unit tests không thay thế kiểm thử tích hợp này.

## Trạng thái chuyển thiết bị hiện hữu

`FARM-ESP32-001`: **BLOCKED, chưa chuyển**. Không có phiên xác thực hợp lệ từ chủ hiện tại và không có vai trò admin đáng tin cậy đã được xác minh. Không được dùng endpoint như cách bỏ qua thiếu quyền; cần chủ hiện tại tự đăng nhập để khởi tạo chuyển quyền, hoặc một quy trình E2E reset/reassignment riêng được phê duyệt rõ ràng.
