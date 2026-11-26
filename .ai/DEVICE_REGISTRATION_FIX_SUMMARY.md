# Device Registration Fix Summary

Ngày cập nhật: 2026-11-23

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

- Frontend tests at the original device-fix checkpoint: PASS, 23/23. Latest full frontend suite: PASS, 28/28.
- Frontend typecheck/build: PASS; có cảnh báo bundle 597 kB vượt ngưỡng 500 kB.
- Application project build: PASS.
- Backend unit test suite: NOT VERIFIED. Output mặc định bị khóa bởi tiến trình WebAPI đang chạy. Build/test assembly tại output riêng thành công, nhưng VSTest không kết nối tới testhost trong 90 giây.
- Browser MCP connected during the 2026-11-23 audit. Public route/form checks and guest route guards PASS; the authenticated Device Management E2E is BLOCKED because no authorized browser login session was available. No user/device was created and DB was not changed.
- `git diff --check`: PASS.

## Giới hạn

Chưa xác nhận chính xác nguyên nhân 400 ở screenshot. Mã `FARM-ESP32-001` hợp lệ về định dạng; duplicate là khả năng cao cần xác nhận bằng response body/API trên DB test. Không commit, không push, không dừng tiến trình WebAPI, không thực hiện pairing hoặc kiểm thử phần cứng.

No commit or push was performed for the device-registration audit changes.

## Bổ sung kiểm toán 2026-11-23

- Khắc phục thêm lỗi submit im lặng khi DeviceCode hoặc Name rỗng/chỉ có khoảng trắng; hiện form hiển thị lỗi bắt buộc và không gọi API.
- Khắc phục lỗi tải danh sách thiết bị bị nuốt im lặng: UI phân biệt lỗi tải với danh sách rỗng và cung cấp nút thử lại.
- Thêm test empty/whitespace/valid create; valid case kiểm tra request body và dòng mới trong list.
- Thêm test GET thất bại → hiển thị lỗi → retry → danh sách hiện thiết bị; focused Device tests 7/7 PASS, được QA verifier chạy độc lập.
- Frontend hiện tại: 28/28 tests PASS và `npm run build` PASS. Vite còn cảnh báo chunk 597 kB (>500 kB).
- Backend UnitTests: 155/155 PASS với `--artifacts-path` trong thư mục tạm để không va chạm DLL của WebAPI đang chạy.
- Browser MCP kết nối được và xác minh các route public, required-form validation, guard và 404. Luồng Device Management thật vẫn BLOCKED vì không có phiên đăng nhập test được ủy quyền.
- Đầy đủ ma trận route/API/requirements và trạng thái PASS/FAIL/BLOCKED/NOT VERIFIED được ghi ở `.ai/FUNCTIONAL_COVERAGE_MATRIX.md`.
- Continuation audit: Browser MCP xác nhận lại required-field validation, guest guard `/devices`, và lỗi Google OAuth 403 trên origin `127.0.0.1:5173`.
- Không có database test cô lập truy cập được; không chạy migration/ghi DB/publish MQTT. Device/MQTT E2E tiếp tục BLOCKED. Backend regression attempt trong sandbox không kết nối được VSTest testhost trong 90 giây; kết quả 155/155 ở báo cáo trước là kết quả pass gần nhất, không được tính là rerun lần này.
