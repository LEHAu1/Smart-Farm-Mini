# Quy trình phát triển và Pull Request

## Branch và phạm vi

- Dùng nhánh đích mà nhóm thống nhất (`main`, hoặc `develop` nếu đang sử dụng).
- Tạo branch từ nhánh đích đã cập nhật. Mỗi issue có một branch và PR riêng;
  tách phần không liên quan thành PR khác.
- Branch mới: `codex/issue-<số>-<mô-tả-ngắn>`. Các branch `feature/...` hiện có
  tiếp tục được dùng; không cần đổi tên.
- Tiêu đề PR: `[SF-09] Thiết lập CI và quy tắc PR` hoặc mẫu tương tự.
- Không push trực tiếp vào nhánh tích hợp; đưa thay đổi qua PR.

## Trước khi mở PR

1. Đối chiếu Acceptance Criteria, tự review diff và kiểm tra cấu hình/secrets.
2. Chạy các kiểm tra tương ứng bên dưới. Với UI, kiểm tra trên trình duyệt và
   thêm ảnh/video hoặc bằng chứng kiểm thử phù hợp.
3. Commit mã nguồn và lockfile; không commit `node_modules/`, `dist/`, `bin/`,
   `obj/`, kết quả test hoặc file `.env.local`.
4. Push branch, mở PR vào nhánh đích và điền đủ template.
5. Liên kết issue. `Closes #N` tự đóng issue khi merge vào nhánh mặc định;
   dùng `Refs #N` nếu chỉ hoàn thành một phần hoặc merge vào nhánh tích hợp khác.

Frontend (từ `frontend/smartfarm-web/`):

```sh
npm ci
npm test
npm run build
```

Backend (từ thư mục gốc):

```sh
dotnet restore Smart_Farm_Mini.slnx
dotnet build Smart_Farm_Mini.slnx --configuration Release --no-restore
dotnet test backend/SmartFarm.UnitTests/SmartFarm.UnitTests.csproj --configuration Release --no-build --no-restore
```

## Review và merge

- Yêu cầu ít nhất một thành viên khác review và approve trước khi merge.
- Reviewer kiểm tra Acceptance Criteria, hành vi, khả năng đọc code, test,
  cấu hình và các giới hạn được ghi trong PR.
- Tác giả sửa phản hồi; khi thay đổi code sau approve, yêu cầu review lại.
- Chỉ merge khi hai check `Frontend`, `Backend` thành công trên commit mới nhất,
  mọi cuộc thảo luận đã giải quyết và không còn lỗi nghiêm trọng đã biết.
- Người có quyền merge chịu trách nhiệm kiểm tra các điều kiện trên.
- Ưu tiên squash merge cho một issue; sau merge cập nhật issue và xóa branch
  nếu không còn sử dụng. Không đánh dấu Done chỉ vì CI xanh.

## CI

Workflow `.github/workflows/ci.yml` chạy với mọi PR, push vào `main`, `master`,
`develop`, hoặc chạy thủ công từ Actions sau khi workflow có trên nhánh mặc định.
Hai job độc lập dùng Node.js 24 và .NET SDK 10.0.x trên Ubuntu.

- Frontend: `npm ci`, kiểm thử Vitest, kiểm tra TypeScript và Vite build.
- Backend: restore, Release build và test xUnit.
- Báo cáo test được lưu thành artifact trong 14 ngày, kể cả khi job thất bại
  nếu báo cáo đã được sinh ra. Mở Actions → lần chạy → Artifacts để tải về.
- Backend có test domain, device service và token. CI hiển thị số test và cảnh
  báo nếu không có test được thực thi; trạng thái xanh không thay thế kiểm tra
  mức độ bao phủ nghiệp vụ.
- CI này không triển khai ứng dụng, chạy SQL Server/MQTT hoặc test phần cứng.
- Không sử dụng path filters để các check bắt buộc luôn được tạo cho mỗi PR.

## Bật quy tắc bắt buộc trên GitHub

File trong repository chỉ mô tả quy trình; chúng không tự bật bảo vệ nhánh.
Sau khi push và có lần chạy CI đầu tiên, người có quyền quản trị cấu hình
Settings → Rules → Rulesets (hoặc Branches → Branch protection):

1. Áp dụng cho nhánh đích thực tế của nhóm.
2. Require a pull request before merging; yêu cầu ít nhất 1 approval.
3. Dismiss stale pull request approvals when new commits are pushed.
4. Require conversation resolution before merging.
5. Require status checks to pass: chọn các check `Frontend` và `Backend` của CI.
6. Require branches to be up to date before merging.
7. Chặn force push và xóa nhánh được bảo vệ; hạn chế bypass theo chính sách nhóm.

Khả năng áp dụng phụ thuộc quyền tài khoản, loại repository và gói GitHub.
Nếu bật merge queue, bổ sung sự kiện `merge_group` vào CI trước khi sử dụng.

Tham khảo: [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
