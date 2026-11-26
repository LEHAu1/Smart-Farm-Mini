# Device Registration Findings

Ngày cập nhật: 2026-11-23

Branch: `feature/iot-end-to-end-integration`

| ID | Mức độ | Phát hiện | Trạng thái | Bằng chứng / tác động |
|---|---|---|---|---|
| DEV-REG-01 | Medium | UI chỉ hiển thị thông báo Axios chung khi API trả lỗi; người dùng không biết mã thiết bị đã được đăng ký hay lỗi validation nào xảy ra. | FIXED | `frontend/smartfarm-web/src/pages/Devices/index.tsx` đọc các trường an toàn `error`, `message`, `title`, `detail` trước fallback. Test Devices xác nhận duplicate response được hiện và trường `details` không bị lộ. |
| DEV-REG-02 | Medium | Backend có validator nhưng trước đây service không gọi; code/name/description quá dài hoặc DeviceCode không tương thích MQTT có thể qua kiểm tra đầu vào và lỗi ở persistence hoặc khi thiết bị dùng topic. | FIXED | `DeviceService.CreateAsync` gọi `CreateDeviceValidator` trước repository. Giới hạn DeviceCode 1–50 ký tự `[A-Za-z0-9_-]`, Name bắt buộc tối đa 100, Description tối đa 500, OwnerId khác empty. Middleware ánh xạ `ArgumentException` thành HTTP 400. |
| DEV-REG-03 | Medium | `FARM-ESP32-001` trong ảnh có thể đã tồn tại; screenshot không kèm response body nên nguyên nhân 400 không được xác minh trực tiếp. | OPEN / UNCONFIRMED | `DeviceService` trả lỗi duplicate khi `ExistsAsync` true; middleware trả lỗi này dưới JSON `error`. Không tra cứu hay ghi DB dùng chung. |
| DEV-REG-04 | Low | Kiểm tra trùng mã trước khi insert có khoảng đua giữa hai request đồng thời; unique index vẫn bảo vệ DB nhưng lỗi unique có thể không được chuyển thành 400 có thông điệp thân thiện. | OPEN / VERIFIED BY SOURCE REVIEW | Repository precheck + unique DeviceCode index. Chưa có test đồng thời; không thay đổi vì ngoài phạm vi xác nhận lỗi trong ảnh. |
| DEV-REG-05 | Medium | Không có bước chứng minh quyền sở hữu phần cứng hoặc bắt tay thiết bị trong API đăng ký; bản ghi thành công không chứng minh ESP32 đã online/gửi dữ liệu. | REQUIREMENTS GAP / NOT A BUG FIXED HERE | Source/API review không thấy pairing handshake. Cần yêu cầu riêng trước khi thiết kế xác minh thiết bị; không tự thêm yêu cầu ngoài SRS/API hiện có. |
| DEV-REG-06 | Medium | Add Device submit im lặng nếu DeviceCode hoặc Name chỉ gồm whitespace; người dùng không nhận lỗi, API không được gọi. | FIXED + INDEPENDENTLY VERIFIED | `Devices/index.tsx` trim-checks both required fields and shows localized feedback. `Devices.test.tsx` covers empty and whitespace-only values; all 7 focused tests passed and were independently rerun by QA. |
| DEV-REG-07 | Medium | Lỗi GET danh sách thiết bị bị nuốt im lặng; UI giữ danh sách rỗng, khiến người dùng tưởng chưa có thiết bị thay vì biết request thất bại. | FIXED + INDEPENDENTLY VERIFIED | `loadDevices` now sets a localized error state; UI shows `role=alert` and Retry, and hides the empty state. Test simulates failed GET then successful retry; focused suite 7/7, independent QA PASS. |

## False positives đã loại trừ

- `FARM-ESP32-001` thỏa regex mới, nên validation format mới không giải thích được 400 của mã này.
- Không kết luận 400 chắc chắn do duplicate khi chưa có response body hoặc DB test.
- SignalR, trạng thái online, MQTT, telemetry và trạng thái bơm không được dùng để kết luận API đăng ký thành công/thất bại.
- Three `/devices/:deviceId...` routes render `DeviceDetailPlaceholder`; this is recorded as a route implementation gap in `.ai/FUNCTIONAL_COVERAGE_MATRIX.md`, not silently treated as tested registration functionality.
