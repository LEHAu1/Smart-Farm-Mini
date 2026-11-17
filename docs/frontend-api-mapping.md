# TÀI LIỆU ÁNH XẠ API BACKEND VỚI FRONTEND (API CONTRACT MAPPING)
Dự án: **Smart Farm Mini - IoT Smart Agriculture**  
Phiên bản: **1.1.0 (Stage 0 Audit Fixed)**  
Nguồn tham chiếu: **ASP.NET Core WebAPI Controllers, Domain Entities & Application DTOs**

---

## 1. TỔNG QUAN HỆ THỐNG API

- **Tổng số endpoint đã kiểm tra và chuẩn hóa**: **37 endpoints** chia thành 8 nhóm:
  - Auth: **7**
  - Dashboard: **1**
  - Devices: **7**
  - Sensors: **3**
  - Irrigation: **8**
  - Alerts: **4**
  - DeviceCommands: **4**
  - Health: **3**  
  $\Rightarrow 7 + 1 + 7 + 3 + 8 + 4 + 4 + 3 = 37$ endpoints.
- **Base URL mặc định**: `http://localhost:5205` (cấu hình qua biến môi trường `VITE_API_BASE_URL`).
- **Giao thức**: RESTful JSON API trên nền tảng .NET 10.
- **Cơ chế xác thực**: JWT Bearer Token (Access Token sống 15 phút, Refresh Token sống 30 ngày, cơ chế Token Rotation).
- **Phân quyền người dùng & Nguyên tắc bảo mật**:
  - Hệ thống thiết kế cho người dùng cá nhân (User) quản lý các thiết bị IoT của mình.
  - Giao diện đăng ký (`Register`) **KHÔNG hiển thị lựa chọn Role**; Backend tự động gán mặc định `Role = "User"`.
  - Khi thêm thiết bị (`CreateDeviceRequest`), Frontend **KHÔNG cần gửi `ownerId`** (Backend tự động lấy ID từ JWT Claims của tài khoản đang đăng nhập).
  - Mọi API nghiệp vụ nhạy cảm đều có kiểm tra quyền sở hữu (`OwnerId == currentUserId`).
  - **Quy ước điều khiển máy bơm**: Gửi lệnh `START_PUMP` (`payload: "{\"duration\": 60}"`) hoặc `STOP_PUMP`. Frontend KHÔNG tự ý hiển thị máy bơm đang chạy ngay khi bấm nút (optimistic update) mà phải căn cứ vào phản hồi lệnh và trạng thái `isPumpRunning` từ API `/irrigation/status` hoặc luồng dữ liệu cảm biến.
- **Xử lý mã lỗi chuẩn**:
  - `200 OK`: Truy vấn / cập nhật thành công.
  - `201 Created`: Tạo mới thành công (trả về DTO kèm `Location` header).
  - `204 NoContent`: Xóa hoặc thực thi hành động không cần trả về body.
  - `400 BadRequest`: Dữ liệu đầu vào sai validation, sai logic nghiệp vụ.
  - `401 Unauthorized`: Chưa truyền token JWT hoặc token đã hết hạn / không hợp lệ.
  - `403 Forbidden`: Người dùng không có quyền truy cập vào thiết bị của người khác.
  - `404 NotFound`: Không tìm thấy tài nguyên (ID thiết bị, ID lệnh, ID cảnh báo không tồn tại).
  - `503 Service Unavailable`: Hệ thống chưa sẵn sàng hoặc mất kết nối DB (Health Readiness).

---

## 2. BẢNG MÃ ENUM DÙNG CHUNG (DOMAIN ENUMS)

Frontend TypeScript PHẢI định nghĩa chính xác theo giá trị số và tên enum Backend:

### 2.1. SensorType
```typescript
export enum SensorType {
  SoilMoisture = 1,       // Độ ẩm đất (%)
  AirTemperature = 2,     // Nhiệt độ không khí (°C)
  AirHumidity = 3,        // Độ ẩm không khí (%)
  WaterTemperature = 4,   // Nhiệt độ nước (°C)
  WaterLevel = 5          // Mực nước trong bồn (%)
}
```

### 2.2. CommandStatus
```typescript
export enum CommandStatus {
  Pending = 1,       // Đang chờ thiết bị nhận
  Acknowledged = 2,  // Thiết bị đã tiếp nhận
  Completed = 3,     // Lệnh thực hiện thành công
  Failed = 4         // Lệnh thất bại
}
```

### 2.3. AlertSeverity
```typescript
export enum AlertSeverity {
  Info = 1,      // Thông tin
  Warning = 2,   // Cảnh báo
  Critical = 3   // Nghiêm trọng
}
```

### 2.4. IrrigationMode
```typescript
export enum IrrigationMode {
  Manual = 1,     // Tưới thủ công
  Automatic = 2   // Tưới tự động theo ngưỡng độ ẩm
}
```

### 2.5. IrrigationStatus
```typescript
export enum IrrigationStatus {
  InProgress = 1, // Đang tưới
  Completed = 2,  // Đã hoàn thành
  Stopped = 3,    // Bị dừng giữa chừng
  Failed = 4      // Sự cố / thất bại
}
```

---

## 3. CHI TIẾT DANH SÁCH API THEO TỪNG MODULE & TRANG SỬ DỤNG

### 3.1. Nhóm Auth – Xác thực & Tài khoản

#### 3.1.1. Đăng ký tài khoản
- **Endpoint**: `POST /api/Auth/register`
- **Xác thực**: Public
- **Trang sử dụng**: `02. Register`
- **Lưu ý**: Frontend KHÔNG cần truyền `role`. Backend tự động gán `Role = "User"`.
- **Request Body (`RegisterRequest`)**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@",
    "displayName": "Nguyễn Văn A"
  }
  ```
- **Response (`200 OK - AuthResponseDto`)**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "guid-token",
    "expiresAtUtc": "2026-11-15T15:00:00Z",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@example.com",
      "displayName": "user@example.com",
      "role": "User"
    }
  }
  ```

#### 3.1.2. Đăng nhập
- **Endpoint**: `POST /api/Auth/login`
- **Xác thực**: Public
- **Trang sử dụng**: `01. Login`
- **Request Body (`LoginRequest`)**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@"
  }
  ```
- **Response (`200 OK - AuthResponseDto`)**: Cùng cấu trúc như Register.

#### 3.1.3. Cấp lại Token (Refresh Token)
- **Endpoint**: `POST /api/Auth/refresh-token`
- **Xác thực**: Public
- **Trang sử dụng**: Axios Interceptor tự động làm mới token ngầm
- **Request Body (`RefreshTokenRequest`)**:
  ```json
  {
    "refreshToken": "guid-token"
  }
  ```
- **Response (`200 OK - AuthResponseDto`)**: Token mới.

#### 3.1.4. Đăng xuất
- **Endpoint**: `POST /api/Auth/logout`
- **Xác thực**: Public / Bearer
- **Trang sử dụng**: Header User Dropdown / Sidebar Logout Action
- **Request Body (`RefreshTokenRequest`)**:
  ```json
  {
    "refreshToken": "guid-token"
  }
  ```
- **Response (`204 NoContent`)**.

#### 3.1.5. Lấy thông tin cá nhân hiện tại
- **Endpoint**: `GET /api/Auth/me`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: Header, `11. Profile & Settings`
- **Response (`200 OK - UserProfileDto`)**:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@example.com",
    "displayName": "Nguyễn Văn A",
    "phoneNumber": "0912345678",
    "role": "User",
    "createdAtUtc": "2026-11-01T08:00:00Z"
  }
  ```

#### 3.1.6. Cập nhật hồ sơ cá nhân
- **Endpoint**: `PUT /api/Auth/profile`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `11. Profile & Settings`
- **Request Body (`UpdateProfileRequest`)**:
  ```json
  {
    "displayName": "Nguyễn Văn A",
    "phoneNumber": "0912345678"
  }
  ```
- **Response (`200 OK - UserProfileDto`)**.

#### 3.1.7. Đổi mật khẩu
- **Endpoint**: `POST /api/Auth/change-password`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `11. Profile & Settings`
- **Request Body (`ChangePasswordRequest`)**:
  ```json
  {
    "currentPassword": "OldPassword123@",
    "newPassword": "NewPassword123@",
    "confirmNewPassword": "NewPassword123@"
  }
  ```
- **Response (`204 NoContent`)**.

---

### 3.2. Nhóm Dashboard – Tổng quan hệ thống

#### 3.2.1. Lấy dữ liệu tổng hợp Dashboard
- **Endpoint**: `GET /api/Dashboard/summary`
- **Xác thực**: Bearer Token (lọc theo OwnerId của tài khoản hiện tại)
- **Trang sử dụng**: `03. Dashboard`
- **Response (`200 OK - DashboardSummaryDto`)**:
  ```json
  {
    "devices": {
      "totalDevices": 3,
      "onlineDevices": 2,
      "offlineDevices": 1,
      "activeIrrigatingDevices": 1
    },
    "sensors": {
      "averageSoilMoisture": 58.5,
      "averageAirTemperature": 29.2,
      "averageAirHumidity": 72.0,
      "averageWaterTemperature": 26.1,
      "averageWaterLevel": 85.0
    },
    "isAnyPumpRunning": true,
    "recentAlerts": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "deviceId": "22222222-2222-2222-2222-222222222222",
        "alertCode": "ALERT-001",
        "title": "Mực nước thấp",
        "message": "Mực nước bình chứa dưới 20%",
        "severity": 2,
        "severityName": "Warning",
        "isResolved": false,
        "createdAtUtc": "2026-11-15T07:00:00Z",
        "resolvedAtUtc": null
      }
    ],
    "recentIrrigationLogs": [
      {
        "id": "33333333-3333-3333-3333-333333333333",
        "deviceId": "22222222-2222-2222-2222-222222222222",
        "mode": 2,
        "modeName": "Automatic",
        "status": 2,
        "statusName": "Completed",
        "soilMoistureBefore": 38.0,
        "soilMoistureAfter": 65.0,
        "waterAmountMl": 450.0,
        "startedAtUtc": "2026-11-15T06:00:00Z",
        "completedAtUtc": "2026-11-15T06:02:00Z",
        "durationSeconds": 120,
        "note": null
      }
    ]
  }
  ```

---

### 3.3. Nhóm Devices – Quản lý thiết bị IoT

#### 3.3.1. Danh sách thiết bị (Phân trang, tìm kiếm, lọc trạng thái)
- **Endpoint**: `GET /api/Devices`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `04. Devices`, Quick Switcher trong Navbar/Sidebar
- **Query Parameters**:
  - `keyword` (string, optional): Tìm theo tên hoặc DeviceCode.
  - `isOnline` (boolean, optional): Lọc theo Online/Offline.
  - `isActive` (boolean, optional): Lọc theo trạng thái hoạt động/vô hiệu hóa.
  - `pageNumber` (int, default: 1): Số trang.
  - `pageSize` (int, default: 20): Số bản ghi trên trang.
- **Response (`200 OK - PageResult<DeviceDto>`)**:
  ```json
  {
    "items": [
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "ownerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "deviceCode": "ESP32-FARM-01",
        "name": "Vườn Cà Chua A1",
        "description": "Khu nhà màng phía Tây",
        "isOnline": true,
        "isActive": true,
        "createdAtUtc": "2026-11-01T08:00:00Z",
        "updatedAtUtc": "2026-11-15T07:15:00Z",
        "lastSeenAtUtc": "2026-11-15T07:24:00Z"
      }
    ],
    "totalCount": 1,
    "pageIndex": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
  ```

#### 3.3.2. Thêm thiết bị mới
- **Endpoint**: `POST /api/Devices`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `04. Devices` (Modal / Trang thêm thiết bị)
- **Lưu ý**: Frontend KHÔNG cần truyền `ownerId`. Backend tự động lấy ID người dùng từ JWT claims.
- **Request Body (`CreateDeviceRequest`)**:
  ```json
  {
    "deviceCode": "ESP32-FARM-02",
    "name": "Khu Dâu Tây",
    "description": "Chậu treo thông minh"
  }
  ```
- **Response (`201 Created - DeviceDto`)**.

#### 3.3.3. Chi tiết thiết bị
- **Endpoint**: `GET /api/Devices/{id}`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`
- **Response (`200 OK - DeviceDto`)**.

#### 3.3.4. Trạng thái kết nối thiết bị
- **Endpoint**: `GET /api/Devices/{id}/connection`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`, Header Status Badge
- **Response (`200 OK - DeviceConnectionStatusDto`)**:
  ```json
  {
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "deviceCode": "ESP32-FARM-01",
    "name": "Vườn Cà Chua A1",
    "isOnline": true,
    "lastSeenAtUtc": "2026-11-15T07:24:00Z",
    "connectionStatus": "Online"
  }
  ```

#### 3.3.5. Cập nhật thông tin thiết bị
- **Endpoint**: `PUT /api/Devices/{id}`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `04. Devices`, `05. Device Detail`
- **Request Body (`UpdateDeviceRequest`)**:
  ```json
  {
    "name": "Vườn Cà Chua A1 (Đã đổi tên)",
    "description": "Khu nhà màng mới cải tạo"
  }
  ```
- **Response (`200 OK - DeviceDto`)**.

#### 3.3.6. Vô hiệu hóa thiết bị (Soft Deactivate)
- **Endpoint**: `PUT /api/Devices/{id}/deactivate`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `04. Devices`, `05. Device Detail`
- **Response (`204 NoContent`)**.

#### 3.3.7. Kích hoạt lại thiết bị (Re-activate)
- **Endpoint**: `PUT /api/Devices/{id}/activate`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `04. Devices`, `05. Device Detail`
- **Response (`204 NoContent`)**.

---

### 3.4. Nhóm Sensors – Giám sát chỉ số cảm biến

#### 3.4.1. Chỉ số cảm biến mới nhất của thiết bị
- **Endpoint**: `GET /api/devices/{deviceId}/sensors/latest`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`, `06. Sensor Monitoring`
- **Response (`200 OK - SensorTelemetryDto`)**:
  ```json
  {
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "soilMoisture": 54.2,
    "airTemperature": 30.5,
    "airHumidity": 68.0,
    "waterTemperature": 25.4,
    "waterLevel": 82.0,
    "lastUpdatedAtUtc": "2026-11-15T07:20:00Z"
  }
  ```

#### 3.4.2. Lịch sử cảm biến theo thời gian (Vẽ biểu đồ điểm chi tiết)
- **Endpoint**: `GET /api/devices/{deviceId}/sensors/history`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `06. Sensor Monitoring`
- **Query Parameters**:
  - `sensorType` (SensorType, default: `SoilMoisture` = 1)
  - `fromUtc` (DateTimeOffset, default: 24h trước)
  - `toUtc` (DateTimeOffset, default: hiện tại)
- **Response (`200 OK - SensorHistoryDto`)**:
  ```json
  {
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "sensorType": 1,
    "sensorTypeName": "SoilMoisture",
    "unit": "%",
    "dataPoints": [
      {
        "value": 52.1,
        "timestampUtc": "2026-11-15T00:00:00Z"
      },
      {
        "value": 54.2,
        "timestampUtc": "2026-11-15T01:00:00Z"
      }
    ]
  }
  ```

#### 3.4.3. Thống kê dữ liệu cảm biến tổng hợp theo giờ (Min, Max, Avg)
- **Endpoint**: `GET /api/devices/{deviceId}/sensors/aggregates`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `06. Sensor Monitoring` (Biểu đồ dài ngày 7 ngày/30 ngày)
- **Query Parameters**:
  - `sensorType` (SensorType, optional)
  - `fromUtc` (DateTimeOffset, default: 7 ngày trước)
  - `toUtc` (DateTimeOffset, default: hiện tại)
- **Response (`200 OK - IReadOnlyList<SensorAggregateDto>`)**:
  ```json
  [
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "deviceId": "22222222-2222-2222-2222-222222222222",
      "sensorType": 1,
      "sensorTypeName": "SoilMoisture",
      "hourBucket": "2026-11-15T06:00:00Z",
      "avgValue": 53.4,
      "minValue": 49.0,
      "maxValue": 58.2,
      "sampleCount": 120,
      "unit": "%",
      "aggregatedAtUtc": "2026-11-15T07:00:00Z"
    }
  ]
  ```

---

### 3.5. Nhóm Irrigation – Điều khiển & Quy tắc tưới nước

#### 3.5.1. Trạng thái máy bơm & phiên tưới hiện tại
- **Endpoint**: `GET /api/devices/{deviceId}/irrigation/status`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`, `07. Irrigation`
- **Response (`200 OK - IrrigationStatusDto`)**:
  ```json
  {
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "isPumpRunning": false,
    "currentMode": 2,
    "lastIrrigationStartedAtUtc": "2026-11-15T06:00:00Z",
    "lastIrrigationDurationSeconds": 120,
    "lastSoilMoisture": 65.0
  }
  ```

#### 3.5.2. Danh sách quy tắc tưới của thiết bị
- **Endpoint**: `GET /api/devices/{deviceId}/irrigation-rules`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `07. Irrigation`
- **Response (`200 OK - IReadOnlyList<IrrigationRuleDto>`)**:
  ```json
  [
    {
      "id": "55555555-5555-5555-5555-555555555555",
      "deviceId": "22222222-2222-2222-2222-222222222222",
      "name": "Tưới duy trì độ ẩm cà chua",
      "moistureThreshold": 40.0,
      "targetMoisture": 70.0,
      "minIntervalMinutes": 60,
      "maxDurationSeconds": 180,
      "isEnabled": true,
      "createdAtUtc": "2026-11-05T08:00:00Z",
      "updatedAtUtc": "2026-11-05T08:00:00Z",
      "lastTriggeredAtUtc": "2026-11-15T06:00:00Z"
    }
  ]
  ```

#### 3.5.3. Tạo quy tắc tưới mới
- **Endpoint**: `POST /api/devices/{deviceId}/irrigation-rules`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Lưu ý validation**: `MoistureThreshold` <= 100, `TargetMoisture` <= 100, `MoistureThreshold` < `TargetMoisture`, `MaxDurationSeconds` <= 300, mỗi thiết bị chỉ được có tối đa 1 quy tắc đang bật (`isEnabled = true`).
- **Trang sử dụng**: `07. Irrigation`
- **Request Body (`CreateIrrigationRuleRequest`)**:
  ```json
  {
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "name": "Quy tắc mùa hè",
    "moistureThreshold": 35.0,
    "targetMoisture": 65.0,
    "minIntervalMinutes": 45,
    "maxDurationSeconds": 120
  }
  ```
- **Response (`201 Created - IrrigationRuleDto`)**.

#### 3.5.4. Cập nhật cấu hình quy tắc tưới
- **Endpoint**: `PUT /api/irrigation-rules/{ruleId}`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `07. Irrigation`
- **Request Body (`UpdateIrrigationRuleRequest`)**:
  ```json
  {
    "name": "Quy tắc mùa hè (Điều chỉnh)",
    "moistureThreshold": 40.0,
    "targetMoisture": 70.0,
    "minIntervalMinutes": 30,
    "maxDurationSeconds": 150
  }
  ```
- **Response (`200 OK - IrrigationRuleDto`)**.

#### 3.5.5. Bật/Tắt quy tắc tưới (Toggle Rule)
- **Endpoint**: `PATCH /api/irrigation-rules/{ruleId}/toggle`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `07. Irrigation` (Toggle Switch)
- **Request Body (`ToggleIrrigationRuleRequest`, optional)**:
  ```json
  {
    "isEnabled": true
  }
  ```
- **Response (`200 OK - IrrigationRuleDto`)**.

#### 3.5.6. Xóa quy tắc tưới
- **Endpoint**: `DELETE /api/irrigation-rules/{ruleId}`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `07. Irrigation`
- **Response (`204 NoContent`)**.

#### 3.5.7. Danh sách lịch sử tưới (Lọc thiết bị, chế độ, phân trang)
- **Endpoint**: `GET /api/irrigation-logs`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `07. Irrigation`, `09. Irrigation History`
- **Query Parameters**:
  - `deviceId` (Guid, optional)
  - `mode` (IrrigationMode, optional: 1=Manual, 2=Automatic)
  - `pageNumber` (int, default: 1)
  - `pageSize` (int, default: 20)
- **Response (`200 OK - PageResult<IrrigationLogDto>`)**:
  ```json
  {
    "items": [
      {
        "id": "33333333-3333-3333-3333-333333333333",
        "deviceId": "22222222-2222-2222-2222-222222222222",
        "mode": 1,
        "modeName": "Manual",
        "status": 2,
        "statusName": "Completed",
        "soilMoistureBefore": 32.0,
        "soilMoistureAfter": 60.5,
        "waterAmountMl": 500.0,
        "startedAtUtc": "2026-11-15T05:30:00Z",
        "completedAtUtc": "2026-11-15T05:32:00Z",
        "durationSeconds": 120,
        "note": "Tưới thủ công qua Web"
      }
    ],
    "totalCount": 1,
    "pageIndex": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
  ```

#### 3.5.8. Chi tiết một phiên tưới nước
- **Endpoint**: `GET /api/irrigation-logs/{logId}`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `09. Irrigation History` (Drawer/Modal chi tiết)
- **Response (`200 OK - IrrigationLogDto`)**.

---

### 3.6. Nhóm Alerts – Cảnh báo sự cố

#### 3.6.1. Danh sách cảnh báo (Lọc mức độ, trạng thái xử lý, phân trang)
- **Endpoint**: `GET /api/alerts`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `08. Alerts`
- **Query Parameters**:
  - `severity` (AlertSeverity, optional: 1=Info, 2=Warning, 3=Critical)
  - `isResolved` (boolean, optional)
  - `deviceId` (Guid, optional)
  - `pageIndex` (int, default: 1)
  - `pageSize` (int, default: 20)
- **Response (`200 OK - PageResult<AlertDto>`)**:
  ```json
  {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "deviceId": "22222222-2222-2222-2222-222222222222",
        "alertCode": "ALT-1731654000-A1B2C3",
        "title": "Nhiệt độ nước vượt ngưỡng",
        "message": "Nhiệt độ nước đo được 36.5°C, nguy cơ ảnh hưởng rễ cây.",
        "severity": 3,
        "severityName": "Critical",
        "isResolved": false,
        "createdAtUtc": "2026-11-15T07:00:00Z",
        "resolvedAtUtc": null
      }
    ],
    "totalCount": 1,
    "pageIndex": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
  ```

#### 3.6.2. Thống kê tổng hợp cảnh báo
- **Endpoint**: `GET /api/alerts/summary`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: Header Notification Popover, `08. Alerts` Metric Cards
- **Response (`200 OK - AlertSummaryDto`)**:
  ```json
  {
    "total": 5,
    "critical": 1,
    "warning": 2,
    "info": 2,
    "unresolved": 3
  }
  ```

#### 3.6.3. Chi tiết cảnh báo
- **Endpoint**: `GET /api/alerts/{id}`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `08. Alerts` (Drawer/Modal chi tiết)
- **Response (`200 OK - AlertDto`)**.

#### 3.6.4. Đánh dấu đã xử lý cảnh báo (Resolve Alert)
- **Endpoint**: `PATCH /api/alerts/{id}/resolve`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `08. Alerts`
- **Response (`200 OK - AlertDto`)**: Trả về AlertDto đã cập nhật `isResolved = true` và `resolvedAtUtc`.

---

### 3.7. Nhóm DeviceCommands – Lệnh điều khiển thiết bị

#### 3.7.1. Gửi lệnh điều khiển thiết bị (Bật/tắt bơm thủ công, cấu hình, v.v.)
- **Endpoint**: `POST /api/devices/{deviceId}/commands`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`, `07. Irrigation` (Nút Bơm/Dừng bơm)
- **Lưu ý đặc biệt**: Backend chấp nhận `Action` và `Payload` tùy biến. Với thao tác tưới thủ công:
  - Bật bơm: `action: "START_PUMP"`, `payload: "{\"duration\": 60}"`
  - Dừng bơm: `action: "STOP_PUMP"`, `payload: null`
- **Request Body (`ManualDeviceCommandRequest`)**:
  ```json
  {
    "action": "START_PUMP",
    "payload": "{\"duration\":60}"
  }
  ```
- **Response (`201 Created - DeviceCommandDto`)**:
  ```json
  {
    "id": "66666666-6666-6666-6666-666666666666",
    "deviceId": "22222222-2222-2222-2222-222222222222",
    "commandCode": "CMD-1731654000-9F8E7D",
    "action": "START_PUMP",
    "payload": "{\"duration\":60}",
    "status": 1,
    "statusName": "Pending",
    "createdAtUtc": "2026-11-15T07:25:00Z",
    "acknowledgedAtUtc": null,
    "completedAtUtc": null,
    "errorMessage": null
  }
  ```

#### 3.7.2. Lịch sử lệnh theo thiết bị
- **Endpoint**: `GET /api/devices/{deviceId}/commands`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `05. Device Detail`, `10. Command History`
- **Query Parameters**:
  - `status` (CommandStatus, optional: 1=Pending, 2=Acknowledged, 3=Completed, 4=Failed)
  - `pageIndex` (int, default: 1)
  - `pageSize` (int, default: 20)
- **Response (`200 OK - PageResult<DeviceCommandDto>`)**.

#### 3.7.3. Tất cả lịch sử lệnh của người dùng
- **Endpoint**: `GET /api/commands`
- **Xác thực**: Bearer Token
- **Trang sử dụng**: `10. Command History`
- **Query Parameters**:
  - `status` (CommandStatus, optional)
  - `pageIndex` (int, default: 1)
  - `pageSize` (int, default: 20)
- **Response (`200 OK - PageResult<DeviceCommandDto>`)**.

#### 3.7.4. Chi tiết một lệnh điều khiển
- **Endpoint**: `GET /api/commands/{commandId}`
- **Xác thực**: Bearer Token (Kiểm tra quyền sở hữu)
- **Trang sử dụng**: `10. Command History` (Drawer/Modal chi tiết lệnh)
- **Response (`200 OK - DeviceCommandDto`)**.

---

### 3.8. Nhóm Health – Giám sát Backend & Database

#### 3.8.1. Kiểm tra sức khỏe tổng quan
- **Endpoint**: `GET /health`
- **Xác thực**: Public
- **Response (`200 OK`)**: `{ "status": "Healthy", "timestampUtc": "..." }`

#### 3.8.2. Liveness Probe
- **Endpoint**: `GET /health/live`
- **Xác thực**: Public
- **Response (`200 OK`)**: `{ "status": "Alive", "timestampUtc": "..." }`

#### 3.8.3. Readiness Probe (Kiểm tra kết nối SQL Server)
- **Endpoint**: `GET /health/ready`
- **Xác thực**: Public
- **Response**:
  - `200 OK` (Sẵn sàng): `{ "status": "Ready", "checks": { "database": "Ready" } }`
  - `503 Service Unavailable` (Mất kết nối DB): `{ "status": "Degraded", "checks": { "database": "Error: ..." } }`

