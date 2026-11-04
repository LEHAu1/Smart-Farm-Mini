# Issue #9 — CI và quy tắc Pull Request

Ngày kiểm tra: 04/11/2026 (Asia/Ho_Chi_Minh).

## Thay đổi

- `.github/workflows/ci.yml`: hai job Frontend và Backend, chạy trên PR,
  push nhánh tích hợp và workflow_dispatch.
- `.github/pull_request_template.md`: mục tiêu, issue, bằng chứng, rủi ro,
  checklist tác giả và reviewer.
- `CONTRIBUTING.md`: branch, kiểm tra local, review, merge và hướng dẫn bật
  bảo vệ nhánh trên GitHub.
- Bỏ qua thư mục báo cáo test và thư mục kiểm tra cài sạch trong `.gitignore`.

## Kết quả local

| Kiểm tra | Kết quả |
| --- | --- |
| Cài sạch bằng `npm ci` trong thư mục kiểm tra riêng với cùng package.json/lockfile | Đạt; 196 package được cài, audit 0 vulnerabilities tại thời điểm chạy |
| Frontend Vitest | 1 file / 5 test đạt |
| Frontend xuất JUnit | Đạt; `frontend/smartfarm-web/test-results/junit.xml` |
| Frontend TypeScript + Vite build | Đạt |
| Backend Release build với `--no-restore` | Đạt, 0 warning / 0 error |
| Backend test với `--no-build --no-restore` | Lệnh kết thúc thành công nhưng có 0 test được thực thi |
| Backend xuất TRX | Đạt; `test-results/backend/backend.trx` |
| `git diff --check` | Đạt |

Frontend test command (từ thư mục frontend):

```sh
npm test -- --reporter=default --reporter=junit --outputFile=test-results/junit.xml
npm run build
```

Trên PowerShell, dùng `npm.cmd test -- ...` nếu lớp bọc npm.ps1 làm mất dấu
`--` và không chuyển các đối số reporter cho Vitest.

Backend commands (từ thư mục gốc):

```sh
dotnet build Smart_Farm_Mini.slnx --configuration Release --no-restore
dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --configuration Release --no-build --no-restore --logger "trx;LogFileName=backend.trx" --results-directory test-results/backend
```

Máy local dùng Node.js 24.0.0, .NET SDK 11 preview để build target net10.0.
CI được cấu hình cài .NET SDK 10.0.x ổn định. Chưa xác minh toàn bộ workflow
trên runner Ubuntu hoặc phiên bản SDK 10.0.x trong môi trường này.

Lần `npm ci` đầu tiên tại thư mục frontend đang chạy Vite gặp EPERM do các
native module bị Windows khóa. Dependency đã được khôi phục bằng `npm install`;
`npm ci` sau đó được xác minh trong thư mục `.ci-validation/` độc lập, được ignore.
Các kiểm tra frontend dùng thư mục ứng dụng đã khôi phục và đều thành công.

## Còn lại trên GitHub

- Push branch và mở PR; xác nhận cả hai job chạy thành công trên commit mới nhất.
- Đính kèm link lần chạy Actions và kiểm tra tải được hai artifact báo cáo.
- Sau khi workflow có trên nhánh mặc định, PR mới sẽ tự nhận template.
- Quản trị viên bật quy tắc bắt buộc theo CONTRIBUTING.md, chọn check Frontend
  và Backend sau khi chúng đã xuất hiện trong lần chạy CI.
- Thành viên khác review và approve.

Chưa push, tạo PR hoặc thay đổi cài đặt bảo vệ nhánh trong tác vụ này. Bằng chứng
local không thay thế kết quả chạy GitHub Actions và không có nghĩa backend đã
có độ bao phủ kiểm thử nghiệp vụ.
