# Device Registration E2E Test Report

Ngày kiểm tra: 2026-11-22

Branch: `feature/iot-end-to-end-integration`

## Phạm vi và an toàn

Đã rà soát tài liệu API/frontend mapping, firmware README, các luồng `DevicesController` → `DeviceService` → repository, exception middleware và màn hình Devices. Không tạo tài khoản/thiết bị trong DB, không sửa dữ liệu thật, không gửi lệnh thiết bị, không nạp firmware. Đăng ký bản ghi thiết bị là gán một `DeviceCode` cho tài khoản; endpoint này không xác minh ESP32 đã ghép nối, online hoặc gửi telemetry.

## Tóm tắt tình trạng

| ID | Thành phần | Kịch bản | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| DEV-UI-01 | Browser/UI | Mở `/devices` bằng Chrome hiện tại | BLOCKED | Chưa có phiên đăng nhập; chuyển hướng `/login?returnUrl=%2Fdevices`. Không có tài khoản test backend được xác minh. |
| DEV-UI-02 | Browser/UI | Xem modal đăng ký và response 400 thực tế | NOT VERIFIED | Ảnh người dùng cho thấy modal với `FARM-ESP32-001` nhận 400, nhưng chưa có request/response body trong Network. |
| DEV-UI-03 | Frontend unit | Hiển thị lỗi API trùng mã và không lộ trường chẩn đoán | PASS | `npm test -- --run`: 8 files, 23 tests passed; test Devices mới 2/2. |
| DEV-UI-04 | Frontend validation | Mã sai định dạng bị chặn trước API | PASS | Có test xác nhận mã không hợp lệ không gọi API. |
| DEV-UI-05 | Frontend build | Typecheck và production build | PASS | `npm run build` thành công. Vite cảnh báo bundle JS 597 kB > 500 kB. |
| DEV-API-01 | Backend build | Application project | PASS | `dotnet build backend/SmartFarm.Application/SmartFarm.Application.csproj --no-restore` thành công, 0 warning/error. |
| DEV-API-02 | Backend unit | DeviceService tests và bộ UnitTests | NOT VERIFIED | Test assembly build trong output cô lập; VSTest không kết nối được testhost sau 90 giây. Output chuẩn bị khóa bởi WebAPI đang chạy. |
| DEV-API-03 | API auth | POST khi thiếu token / sai owner | NOT VERIFIED | Controller source yêu cầu bearer auth và gán OwnerId từ người dùng hiện tại; chưa chạy request trực tiếp. |
| DEV-API-04 | Persistence | Tạo/xác nhận bản ghi ở DB | BLOCKED | Không có DB cô lập được xác nhận và không được ghi vào DB dùng chung. |
| DEV-IOT-01 | MQTT/hardware | DeviceCode thật gửi telemetry sau đăng ký | NOT VERIFIED | Không dùng phần cứng/MQTT trong lượt này. Đăng ký DB không đồng nghĩa đã ghép nối phần cứng. |
| DEV-IOT-02 | Actuator | Điều khiển bơm qua luồng đăng ký | NOT APPLICABLE | Không gửi lệnh điều khiển; endpoint đăng ký thiết bị không phải luồng điều khiển. |

## Đối chiếu lỗi 400 trong ảnh

`FARM-ESP32-001` thỏa định dạng mới và giới hạn 50 ký tự. API hiện kiểm tra mã đã tồn tại toàn hệ thống và trả 400 với thông báo tiếng Việt khi trùng. Vì chưa lấy được response body và không truy cập được màn hình có phiên đăng nhập, duplicate là một nguyên nhân có khả năng cao nhưng chưa thể xác nhận cho request trong ảnh. Sau thay đổi frontend, lần thử tiếp theo sẽ hiển thị trường `error` của API thay vì chỉ hiện `Request failed with status code 400`.

## Lệnh đã chạy và kết quả

- `npm test -- --run` (frontend): PASS, 8 files / 23 tests.
- `npm run build` (frontend): PASS, typecheck và Vite build; có cảnh báo kích thước chunk.
- `dotnet build backend/SmartFarm.Application/SmartFarm.Application.csproj --no-restore`: PASS.
- `dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --no-restore`: FAIL do WebAPI đang chạy giữ khóa DLL trong `backend/SmartFarm.WebAPI/bin/Debug/net10.0`.
- `dotnet test ... --no-restore --disable-build-servers -m:1 -p:BaseOutputPath=.tmp/device-registration-tests/bin/`: compile được các project và test assembly ở output riêng, nhưng FAIL khi VSTest không kết nối tới `testhost` sau 90 giây. Không dừng WebAPI.
- `git diff --check`: PASS.

## Điều kiện để hoàn tất E2E

Cần một phiên Chrome đã đăng nhập bằng tài khoản dev/test được phép và một DB disposable/được xác nhận là test DB. Khi có, kiểm tra response body của POST (đặc biệt lỗi mã đã tồn tại), tạo một `DeviceCode` tổng hợp duy nhất, xác minh owner và bản ghi, rồi dọn dữ liệu trong chính DB test theo quy trình được phép. Sau đó xác minh telemetry riêng; không suy ra pairing từ HTTP 201.
