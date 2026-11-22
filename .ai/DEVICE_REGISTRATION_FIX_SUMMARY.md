# Device Registration Fix Summary

Ngày: 2026-11-22

Branch: `feature/iot-end-to-end-integration`

## Thay đổi

- `frontend/smartfarm-web/src/pages/Devices/index.tsx`
  - Hiển thị thông báo API từ `error`, `message`, `title` hoặc `detail`, sau đó mới fallback; không đưa `details`/stack trace vào UI.
  - Giới hạn `DeviceCode` 50, `Name` 100, `Description` 500 ký tự.
  - Chặn `DeviceCode` không khớp `[A-Za-z0-9_-]{1,50}` trước khi gọi API.
- `frontend/smartfarm-web/src/pages/Devices/Devices.test.tsx`
  - Thêm test cho lỗi mã trùng 400 và validation mã sai định dạng.
- `backend/SmartFarm.Application/Validators/CreateDeviceValidator.cs`
  - Thêm kiểm tra DeviceCode tương thích quy ước MQTT và các giới hạn trường.
- `backend/SmartFarm.Application/Services/DeviceService.cs`
  - Gọi validator trước khi truy vấn hoặc ghi repository.
- `backend/SmartFarm.UnitTests/Services/DeviceServiceTests.cs`
  - Thêm kiểm tra input sai, giới hạn tối đa và giá trị ở biên hợp lệ; giữ test mã trùng.

## Xác minh

- Frontend tests: PASS, 23/23.
- Frontend typecheck/build: PASS; có cảnh báo bundle 597 kB vượt ngưỡng 500 kB.
- Application project build: PASS.
- Backend unit test suite: NOT VERIFIED. Output mặc định bị khóa bởi tiến trình WebAPI đang chạy. Build/test assembly tại output riêng thành công, nhưng VSTest không kết nối tới testhost trong 90 giây.
- Browser E2E: BLOCKED do Chrome chưa có phiên đăng nhập test; không tạo user/device và không thay đổi DB.
- `git diff --check`: PASS.

## Giới hạn

Chưa xác nhận chính xác nguyên nhân 400 ở screenshot. Mã `FARM-ESP32-001` hợp lệ về định dạng; duplicate là khả năng cao cần xác nhận bằng response body/API trên DB test. Không commit, không push, không dừng tiến trình WebAPI, không thực hiện pairing hoặc kiểm thử phần cứng.

Lưu ý: workspace có thay đổi auth chưa commit từ trước khi xử lý issue đăng ký thiết bị; các thay đổi đó được giữ nguyên và không thuộc phạm vi báo cáo này.
