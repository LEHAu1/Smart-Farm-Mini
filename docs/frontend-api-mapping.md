# Smart Farm Mini — Frontend API Contract Mapping (OpenAPI / REST)

> **Tài liệu kiểm toán API Contract dành cho đội ngũ phát triển Frontend (Stage 0).**  
> Nguồn sự thật: Backend ASP.NET Core WebAPI (`SmartFarm.WebAPI`), Application DTOs (`SmartFarm.Application`), Domain Enums (`SmartFarm.Domain.Enums`).  
> Base URL (Local Development): `http://localhost:5205` (theo `launchSettings.json` profile `http`).

---

## 1. Quy chuẩn chung (Global Conventions)

### 1.1 Xác thực & Header
- **Authentication Scheme:** `Bearer <JWT_ACCESS_TOKEN>`
- **Token Storage:** Quản lý Access Token (15 phút) trong bộ nhớ / Secure Storage và Refresh Token (30 ngày) cho cơ chế Token Rotation.
- **Default Headers:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token> (đối với các endpoint yêu cầu xác thực)
  ```

### 1.2 Cấu trúc lỗi chuẩn (`GlobalExceptionMiddleware`)
Mọi phản hồi lỗi (4xx, 5xx) từ Backend đều tuân theo schema:
```json
{
  "status": 400,
  "error": "Thông báo lỗi chi tiết dành cho người dùng",
  "details": "Chi tiết stack trace (chỉ hiển thị trong môi trường Development khi lỗi 500)",
  "timestampUtc": "2026-11-16T13:50:00.0000000Z"
}
```

| HTTP Status | Trường hợp phát sinh |
|---|---|
| **`400 Bad Request`** | Dữ liệu đầu vào không hợp lệ (Validation fail, Domain rule violation). |
| **`401 Unauthorized`** | Thiếu token, token hết hạn hoặc thông tin đăng nhập sai. |
| **`403 Forbidden`** | Người dùng thường cố gắng truy cập thiết bị/dữ liệu của người dùng khác (không phải Admin). |
| **`404 Not Found`** | Không tìm thấy tài nguyên theo ID (`deviceId`, `ruleId`, v.v.). |
| **`500 Internal Server Error`** | Lỗi hệ thống chưa được kiểm soát. |

### 1.3 Cấu trúc phân trang chung (`PageResult<T>`)
Áp dụng cho các API danh sách có phân trang (`/api/devices`, `/api/irrigation-logs`):
```json
{
  "items": [],
  "totalCount": 42,
  "pageIndex": 1,
  "pageSize": 20,
  "totalPages": 3,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

---

## 2. Danh mục Enums hệ thống

### 2.1 `SensorType` (Kiểu cảm biến)
```typescript
export enum SensorType {
  SoilMoisture = 1,     // Độ ẩm đất (%)
  AirTemperature = 2,   // Nhiệt độ không khí (°C)
  AirHumidity = 3,      // Độ ẩm không khí (%)
  WaterTemperature = 4, // Nhiệt độ nước bồn (°C)
  WaterLevel = 5        // Mực nước bồn chứa (%)
}
```

### 2.2 `IrrigationMode` (Chế độ tưới)
```typescript
export enum IrrigationMode {
  Manual = 1,    // Tưới thủ công (người dùng bấm nút)
  Automatic = 2  // Tưới tự động (hệ thống kích hoạt theo quy tắc ngưỡng)
}
```

### 2.3 `IrrigationStatus` (Trạng thái phiên tưới)
```typescript
export enum IrrigationStatus {
  InProgress = 1, // Đang bơm nước
  Completed = 2,  // Hoàn thành bình thường
  Stopped = 3,    // Bị dừng giữa chừng (người dùng ngắt hoặc hết nước)
  Failed = 4      // Sự cố lỗi (quá thời gian, bơm không chạy)
}
```

### 2.4 `AlertSeverity` (Mức độ nghiêm trọng cảnh báo)
```typescript
export enum AlertSeverity {
  Info = 1,     // Thông tin
  Warning = 2,  // Cảnh báo (nhiệt độ cao, độ ẩm thấp)
  Critical = 3  // Sự cố nghiêm trọng (mất nước, rò rỉ, thiết bị mất tín hiệu)
}
```

### 2.5 `CommandStatus` (Trạng thái lệnh điều khiển)
```typescript
export enum CommandStatus {
  Pending = 1,      // Chờ ESP32 nhận lệnh
  Acknowledged = 2, // ESP32 đã xác nhận nhận lệnh
  Completed = 3,    // Đã thực thi xong
  Failed = 4        // Lệnh bị lỗi / timeout
}
```

---

## 3. Bảng Mapping Chi Tiết Tất Cả API

### 3.1 Nhóm 1: Xác thực & Quản lý Tài khoản (`AuthController`)

#### 1. Đăng ký tài khoản (`register`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/register`
- **Authentication:** Không yêu cầu (`Anonymous`)
- **Trang sử dụng:** `/register`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`RegisterRequest`):**
  ```typescript
  interface RegisterRequest {
    userName: string;     // Bắt buộc, không trùng
    email: string;        // Bắt buộc, định dạng email, không trùng
    password: string;     // Bắt buộc, tối thiểu 8 ký tự, có chữ và số
    displayName?: string; // Tùy chọn (mặc định lấy theo userName)
  }
  ```
- Vai trò được backend gán cố định là `User`; request đăng ký không nhận trường `role`.
- **Response DTO (200 OK — `AuthResponseDto`):**
  ```typescript
  interface AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    expiresAtUtc: string; // ISO 8601
    user: {
      id: string;         // UUID
      userName: string;
      email: string;
      displayName?: string;
      role: string;       // "User" | "Admin"
    };
  }
  ```

#### 2. Đăng nhập tài khoản (`login`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/login`
- **Authentication:** Không yêu cầu (`Anonymous`)
- **Trang sử dụng:** `/login`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`LoginRequest`):**
  ```typescript
  interface LoginRequest {
    userNameOrEmail: string; // Username hoặc Email
    password: string;        // Mật khẩu
  }
  ```
- **Response DTO (200 OK):** `AuthResponseDto` (như trên).

#### 2.1 Đăng nhập bằng Google (`google`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/google`
- **Authentication:** Không yêu cầu (`Anonymous`)
- **Trang sử dụng:** `/login`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend & Frontend)**
- **Mô tả:** Nhận Google ID Token (OpenID Connect / Google Identity Services), xác minh chữ ký RSA qua Google Public Keys, trích xuất Subject ID (`sub`), Email, Họ tên và Avatar. Tự động liên kết tài khoản nếu email đã có sẵn hoặc đăng ký mới (mặc định gán Role "User").
- **Request DTO (`GoogleLoginRequest`):**
  ```typescript
  interface GoogleLoginRequest {
    idToken: string; // Google JWT ID Token từ Google Identity Services
  }
  ```
- **Response DTO (200 OK):** `AuthResponseDto` (chứa Access Token 15 phút, Refresh Token 30 ngày và User info).

#### 3. Làm mới Access Token (`refresh-token`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/refresh-token`
- **Authentication:** Không yêu cầu (`Anonymous` kèm refresh token trong body)
- **Trang sử dụng:** `api-client` interceptor (tự động làm mới khi gặp 401)
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`RefreshTokenRequest`):**
  ```typescript
  interface RefreshTokenRequest {
    refreshToken: string;
  }
  ```
- **Response DTO (200 OK):** `AuthResponseDto` (nhận cặp Access + Refresh Token mới).

#### 4. Đăng xuất (`logout`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/logout`
- **Authentication:** Không yêu cầu (`Anonymous`)
- **Trang sử dụng:** Header / Menu người dùng
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`RefreshTokenRequest`):** `{ refreshToken: string }`
- **Response DTO (204 No Content):** Không có body.

#### 5. Lấy hồ sơ người dùng (`me`)
- **Method:** `GET`
- **Endpoint:** `/api/Auth/me`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** `/profile`, Header thông tin người dùng
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO:** Không có
- **Response DTO (200 OK — `UserProfileDto`):**
  ```typescript
  interface UserProfileDto {
    id: string;
    userName: string;
    email: string;
    displayName?: string;
    phoneNumber?: string;
    role: string;
    createdAtUtc: string;
  }
  ```

#### 6. Cập nhật hồ sơ (`profile`)
- **Method:** `PUT`
- **Endpoint:** `/api/Auth/profile`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** `/profile`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`UpdateProfileRequest`):**
  ```typescript
  interface UpdateProfileRequest {
    displayName?: string;
    phoneNumber?: string;
  }
  ```
- **Response DTO (200 OK):** `UserProfileDto` đã cập nhật.

#### 7. Đổi mật khẩu (`change-password`)
- **Method:** `POST`
- **Endpoint:** `/api/Auth/change-password`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** `/profile` / Cài đặt bảo mật
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`ChangePasswordRequest`):**
  ```typescript
  interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }
  ```
- **Response DTO (204 No Content):** Không có body.

---

### 3.2 Nhóm 2: Dashboard Tổng Quan (`DashboardController`)

#### 8. Lấy số liệu tổng hợp khu vườn (`summary`)
- **Method:** `GET`
- **Endpoint:** `/api/Dashboard/summary`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** `/dashboard`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO:** Không có
- **Response DTO (200 OK — `DashboardSummaryDto`):**
  ```typescript
  interface DashboardSummaryDto {
    devices: {
      totalDevices: number;
      onlineDevices: number;
      offlineDevices: number;
      activeIrrigatingDevices: number;
    };
    sensors: {
      averageSoilMoisture?: number | null;     // %
      averageAirTemperature?: number | null;   // °C
      averageAirHumidity?: number | null;      // %
      averageWaterTemperature?: number | null; // °C
      averageWaterLevel?: number | null;       // %
    };
    isAnyPumpRunning: boolean;
    recentAlerts: AlertDto[];
    recentIrrigationLogs: IrrigationLogDto[];
  }
  ```

---

### 3.3 Nhóm 3: Quản lý Thiết bị IoT (`DevicesController`)

#### 9. Danh sách thiết bị có lọc & phân trang
- **Method:** `GET`
- **Endpoint:** `/api/Devices`
- **Authentication:** `Bearer JWT` (User thấy thiết bị của mình; Admin thấy toàn bộ)
- **Trang sử dụng:** `/devices`, `/dashboard` (dropdown chọn thiết bị active)
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Query Parameters:**
  - `keyword?: string` — Tìm theo tên hoặc mã thiết bị
  - `isOnline?: boolean` — Lọc theo trạng thái kết nối
  - `isActive?: boolean` — Lọc theo cờ kích hoạt
  - `pageNumber?: number = 1`
  - `pageSize?: number = 20`
- **Response DTO (200 OK):** `PageResult<DeviceDto>`
  ```typescript
  interface DeviceDto {
    id: string;               // UUID
    ownerId: string;          // UUID chủ sở hữu
    deviceCode: string;       // VD: "ESP32-POT-001"
    name: string;             // VD: "Chậu cà chua bi"
    description?: string;
    isOnline: boolean;        // Kết nối MQTT/Gateway
    isActive: boolean;
    createdAtUtc: string;
    updatedAtUtc: string;
    lastSeenAtUtc?: string | null;
  }
  ```

#### 10. Chi tiết thiết bị theo ID
- **Method:** `GET`
- **Endpoint:** `/api/Devices/{id}`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** `/devices/:deviceId`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `id: string` (UUID)
- **Response DTO (200 OK):** `DeviceDto` (404 nếu không tồn tại, 403 nếu không có quyền).

#### 11. Đăng ký thiết bị mới
- **Method:** `POST`
- **Endpoint:** `/api/Devices`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Modal "Thêm thiết bị mới" tại `/devices`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Request DTO (`CreateDeviceRequest`):**
  ```typescript
  interface CreateDeviceRequest {
    ownerId?: string;     // Tùy chọn (Backend tự gán currentUserId nếu rỗng)
    deviceCode: string;   // Bắt buộc, tối đa 50 ký tự, DUY NHẤT
    name: string;         // Bắt buộc, tối đa 100 ký tự
    description?: string; // Tối đa 500 ký tự
  }
  ```
- **Response DTO (201 Created):** `DeviceDto`.

#### 12. Cập nhật thông tin thiết bị (Tên & Mô tả)
- **Method:** `PUT`
- **Endpoint:** `/api/Devices/{id}`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Modal "Chỉnh sửa thiết bị" tại `/devices` hoặc `/devices/:deviceId`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `id: string` (UUID)
- **Request DTO (`UpdateDeviceRequest`):**
  ```typescript
  interface UpdateDeviceRequest {
    name: string;         // Bắt buộc, tối đa 100 ký tự
    description?: string; // Tối đa 500 ký tự
  }
  ```
- **Response DTO (200 OK):** `DeviceDto`.

#### 13. Vô hiệu hóa thiết bị
- **Method:** `PUT`
- **Endpoint:** `/api/Devices/{id}/deactivate`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Thao tác "Tạm ngưng hoạt động" trên `/devices`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `id: string` (UUID)
- **Response DTO (204 No Content):** Không có body.

#### 14. Kích hoạt lại thiết bị
- **Method:** `PUT`
- **Endpoint:** `/api/Devices/{id}/activate`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Thao tác "Kích hoạt lại" trên `/devices`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `id: string` (UUID)
- **Response DTO (204 No Content):** Không có body.

---

### 3.4 Nhóm 4: Dữ liệu Cảm biến IoT (`SensorsController`)

#### 15. Chỉ số cảm biến tức thời mới nhất (`latest`)
- **Method:** `GET`
- **Endpoint:** `/api/devices/{deviceId}/sensors/latest`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Thẻ cảm biến thời gian thực tại `/dashboard`, `/devices/:deviceId`, `/devices/:deviceId/sensors`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `deviceId: string` (UUID)
- **Response DTO (200 OK — `SensorTelemetryDto`):**
  ```typescript
  interface SensorTelemetryDto {
    deviceId: string;
    soilMoisture?: number | null;     // %
    airTemperature?: number | null;   // °C
    airHumidity?: number | null;      // %
    waterTemperature?: number | null; // °C
    waterLevel?: number | null;       // %
    lastUpdatedAtUtc?: string | null; // ISO 8601
  }
  ```

#### 16. Lịch sử dữ liệu cảm biến ngắn hạn (Vẽ biểu đồ chuỗi thời gian)
- **Method:** `GET`
- **Endpoint:** `/api/devices/{deviceId}/sensors/history`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Biểu đồ đường tại `/devices/:deviceId/sensors`, `/history`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:**
  - path `deviceId: string`
  - query `sensorType: SensorType = 1` (1=SoilMoisture, 2=AirTemp, 3=AirHum, 4=WaterTemp, 5=WaterLevel)
  - query `fromUtc?: string` (Mặc định: `toUtc - 24h`)
  - query `toUtc?: string` (Mặc định: thời điểm hiện tại `UtcNow`)
- **Response DTO (200 OK — `SensorHistoryDto`):**
  ```typescript
  interface SensorHistoryDto {
    deviceId: string;
    sensorType: SensorType;
    sensorTypeName: string; // "SoilMoisture", "AirTemperature", ...
    unit: string;           // "%", "°C", ...
    dataPoints: {
      value: number;
      timestampUtc: string;
    }[];
  }
  ```

#### 17. Thống kê cảm biến theo giờ (Biểu đồ dài ngày, Min/Max/Avg)
- **Method:** `GET`
- **Endpoint:** `/api/devices/{deviceId}/sensors/aggregates`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Phân tích xu hướng 7 ngày / 30 ngày tại `/devices/:deviceId/sensors`, `/history`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:**
  - path `deviceId: string`
  - query `sensorType?: SensorType` (Tùy chọn lọc 1 loại hoặc lấy tất cả)
  - query `fromUtc?: string` (Mặc định: `toUtc - 7 ngày`)
  - query `toUtc?: string` (Mặc định: `UtcNow`)
- **Response DTO (200 OK — `SensorAggregateDto[]`):**
  ```typescript
  interface SensorAggregateDto {
    id: string;
    deviceId: string;
    sensorType: SensorType;
    sensorTypeName: string;
    hourBucket: string;     // Đầu giờ (vd: "2026-11-16T13:00:00Z")
    avgValue: number;
    minValue: number;
    maxValue: number;
    sampleCount: number;    // Số mẫu đo trong giờ
    unit: string;
    aggregatedAtUtc: string;
  }
  ```

---

### 3.5 Nhóm 5: Điều khiển & Quy tắc Tưới Nước (`IrrigationController`)

#### 18. Danh sách quy tắc tưới của thiết bị
- **Method:** `GET`
- **Endpoint:** `/api/devices/{deviceId}/irrigation-rules`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Tab Quy tắc tưới tại `/devices/:deviceId/irrigation`, `/irrigation`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `deviceId: string` (UUID)
- **Response DTO (200 OK — `IrrigationRuleDto[]`):**
  ```typescript
  interface IrrigationRuleDto {
    id: string;
    deviceId: string;
    name: string;
    moistureThreshold: number;  // 0..100 (%)
    targetMoisture: number;     // 0..100 (%), > moistureThreshold
    minIntervalMinutes: number; // >= 0 (phút)
    maxDurationSeconds: number; // 1..300 (giây, tối đa 5 phút)
    isEnabled: boolean;         // Chỉ tối đa 1 rule bật/thiết bị
    createdAtUtc: string;
    updatedAtUtc: string;
    lastTriggeredAtUtc?: string | null;
  }
  ```

#### 19. Tạo quy tắc tưới tự động mới
- **Method:** `POST`
- **Endpoint:** `/api/devices/{deviceId}/irrigation-rules`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Modal "Thêm quy tắc tưới" tại `/devices/:deviceId/irrigation`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `deviceId: string` (UUID)
- **Request DTO (`CreateIrrigationRuleRequest`):**
  ```typescript
  interface CreateIrrigationRuleRequest {
    deviceId: string;           // Phải khớp với route
    name: string;               // 1..100 ký tự
    moistureThreshold: number;  // 0.00 .. 100.00
    targetMoisture: number;     // 0.00 .. 100.00 (> moistureThreshold)
    minIntervalMinutes: number; // >= 0
    maxDurationSeconds: number; // 1 .. 300
  }
  ```
- **Response DTO (201 Created):** `IrrigationRuleDto`.
- **Ràng buộc nghiệp vụ:** Backend tự động kiểm tra, nếu thiết bị đã có 1 quy tắc đang `isEnabled = 1`, hệ thống sẽ trả về lỗi `400` yêu cầu tắt quy tắc cũ trước khi tạo mới.

#### 20. Cập nhật cấu hình quy tắc tưới
- **Method:** `PUT`
- **Endpoint:** `/api/irrigation-rules/{ruleId}`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Modal "Sửa quy tắc tưới"
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `ruleId: string` (UUID)
- **Request DTO (`UpdateIrrigationRuleRequest`):**
  ```typescript
  interface UpdateIrrigationRuleRequest {
    name: string;
    moistureThreshold: number;
    targetMoisture: number;
    minIntervalMinutes: number;
    maxDurationSeconds: number;
  }
  ```
- **Response DTO (200 OK):** `IrrigationRuleDto`.

#### 21. Bật / Tắt quy tắc tưới (`toggle`)
- **Method:** `PATCH`
- **Endpoint:** `/api/irrigation-rules/{ruleId}/toggle`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Nút gạt Switch quy tắc tưới
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `ruleId: string`, query `isEnabled?: boolean`
- **Request DTO (Optional Body — `ToggleIrrigationRuleRequest`):**
  ```typescript
  interface ToggleIrrigationRuleRequest {
    isEnabled?: boolean; // Nếu không truyền body/query, server tự đảo trạng thái hiện tại
  }
  ```
- **Response DTO (200 OK):** `IrrigationRuleDto`.

#### 22. Xóa quy tắc tưới
- **Method:** `DELETE`
- **Endpoint:** `/api/irrigation-rules/{ruleId}`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Nút xóa quy tắc tưới
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `ruleId: string` (UUID)
- **Response DTO (204 No Content):** Không có body.

#### 23. Kiểm tra trạng thái máy bơm tức thời
- **Method:** `GET`
- **Endpoint:** `/api/devices/{deviceId}/irrigation/status`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Thẻ trạng thái bơm thời gian thực trên `/dashboard`, `/devices/:deviceId/irrigation`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Parameters:** path `deviceId: string` (UUID)
- **Response DTO (200 OK — `IrrigationStatusDto`):**
  ```typescript
  interface IrrigationStatusDto {
    deviceId: string;
    isPumpRunning: boolean;
    currentMode: IrrigationMode; // 1=Manual, 2=Automatic
    lastIrrigationStartedAtUtc?: string | null;
    lastIrrigationDurationSeconds?: number | null;
    lastSoilMoisture?: number | null;
  }
  ```

#### 24. Lịch sử các phiên tưới (Lọc & Phân trang)
- **Method:** `GET`
- **Endpoint:** `/api/irrigation-logs`
- **Authentication:** `Bearer JWT`
- **Trang sử dụng:** Bảng lịch sử tưới tại `/irrigation-history`, `/devices/:deviceId/irrigation`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện (Backend)**
- **Query Parameters:**
  - `deviceId?: string` — Lọc theo thiết bị cụ thể (nếu để trống: lấy toàn bộ thiết bị của user)
  - `mode?: IrrigationMode` — 1=Manual, 2=Automatic
  - `pageNumber?: number = 1`
  - `pageSize?: number = 20`
- **Response DTO (200 OK):** `PageResult<IrrigationLogDto>`
  ```typescript
  interface IrrigationLogDto {
    id: string;
    deviceId: string;
    mode: IrrigationMode;
    modeName: string;            // "Manual" | "Automatic"
    status: IrrigationStatus;    // 1=InProgress, 2=Completed, 3=Stopped, 4=Failed
    statusName: string;          // "InProgress", "Completed", ...
    soilMoistureBefore?: number | null; // %
    soilMoistureAfter?: number | null;  // %
    waterAmountMl?: number | null;      // ml
    startedAtUtc: string;
    completedAtUtc?: string | null;
    durationSeconds?: number | null;
    note?: string | null;
  }
  ```

---

### 3.6 Nhóm 6: Health Check & Các Endpoint Dự kiến (Pending Backlog)

#### 25. Health Check hệ thống
- **Method:** `GET`
- **Endpoint:** `/health`
- **Authentication:** `Anonymous`
- **Response:** `200 OK` `{ "status": "Healthy" }`
- **Trạng thái:** ✅ **Đã triển khai hoàn thiện**

#### 26. Quản lý Cảnh báo (`AlertsController`)
- **Trạng thái hiện tại:** ⏳ **Pending Backend Controller**
  - Schema Domain & DTO đã có sẵn: `AlertDto` (`id`, `deviceId`, `alertCode`, `title`, `message`, `severity`, `isResolved`, `createdAtUtc`, `resolvedAtUtc`).
  - Dữ liệu tạm thời: Truy cập qua `DashboardSummaryDto.recentAlerts` (`GET /api/Dashboard/summary`).
  - Dự kiến bổ sung tại Backend Sprint tới:
    - `GET /api/alerts`: Danh sách cảnh báo có phân trang & lọc `severity`, `isResolved`.
    - `PUT /api/alerts/{id}/resolve`: Xác nhận đã xử lý cảnh báo.

#### 27. Lệnh điều khiển trực tiếp máy bơm (`DeviceCommands`)
- **Trạng thái hiện tại:** ⏳ **Pending Backend Controller**
  - Tầng Application đã có `IDeviceCommandService`, `DeviceCommandDto`, `CreateDeviceCommandRequest` (`START_PUMP`, `STOP_PUMP`, `EMERGENCY_STOP`).
  - Backend đang thực thi thông qua MQTT Hosted Service.
  - Dự kiến bổ sung REST Controller: `POST /api/devices/{deviceId}/commands`.

---

## 4. Bảng tổng hợp đối chiếu Endpoint — UI Route

| STT | Endpoint | Method | Trang Frontend sử dụng | Trạng thái Backend |
|---|---|---|---|---|
| 1 | `/api/Auth/register` | `POST` | `/register` | ✅ Ready |
| 2 | `/api/Auth/login` | `POST` | `/login` | ✅ Ready |
| 3 | `/api/Auth/refresh-token` | `POST` | Axios Interceptor | ✅ Ready |
| 4 | `/api/Auth/logout` | `POST` | Header / User Menu | ✅ Ready |
| 5 | `/api/Auth/me` | `GET` | `/profile`, Topbar | ✅ Ready |
| 6 | `/api/Auth/profile` | `PUT` | `/profile` | ✅ Ready |
| 7 | `/api/Auth/change-password` | `POST` | `/profile` | ✅ Ready |
| 8 | `/api/Dashboard/summary` | `GET` | `/dashboard` | ✅ Ready |
| 9 | `/api/Devices` | `GET` | `/devices`, Dashboard select | ✅ Ready |
| 10 | `/api/Devices/{id}` | `GET` | `/devices/:deviceId` | ✅ Ready |
| 11 | `/api/Devices` | `POST` | Modal Add Device | ✅ Ready |
| 12 | `/api/Devices/{id}` | `PUT` | Modal Edit Device | ✅ Ready |
| 13 | `/api/Devices/{id}/deactivate` | `PUT` | `/devices` | ✅ Ready |
| 14 | `/api/Devices/{id}/activate` | `PUT` | `/devices` | ✅ Ready |
| 15 | `/api/devices/{deviceId}/sensors/latest` | `GET` | Dashboard, `/devices/:deviceId/sensors` | ✅ Ready |
| 16 | `/api/devices/{deviceId}/sensors/history` | `GET` | Charts 24h (`/sensors`, `/history`) | ✅ Ready |
| 17 | `/api/devices/{deviceId}/sensors/aggregates`| `GET` | Charts 7d/30d (`/sensors`, `/history`) | ✅ Ready |
| 18 | `/api/devices/{deviceId}/irrigation-rules` | `GET` | `/devices/:deviceId/irrigation`, `/irrigation` | ✅ Ready |
| 19 | `/api/devices/{deviceId}/irrigation-rules` | `POST` | Modal Add Rule | ✅ Ready |
| 20 | `/api/irrigation-rules/{ruleId}` | `PUT` | Modal Edit Rule | ✅ Ready |
| 21 | `/api/irrigation-rules/{ruleId}/toggle` | `PATCH`| Switch Rule Toggle | ✅ Ready |
| 22 | `/api/irrigation-rules/{ruleId}` | `DELETE`| Delete Rule Button | ✅ Ready |
| 23 | `/api/devices/{deviceId}/irrigation/status`| `GET` | Status Card (Bơm chạy/dừng) | ✅ Ready |
| 24 | `/api/irrigation-logs` | `GET` | `/irrigation-history`, Tab Nhật ký | ✅ Ready |
| 25 | `/health` | `GET` | Network Indicator | ✅ Ready |
| 26 | `/api/alerts` | `GET` | `/alerts` | ⏳ Pending Controller (Dùng tạm summary) |
| 27 | `/api/devices/{deviceId}/commands` | `POST`| Nút Bơm tay / E-Stop | ⏳ Pending Controller (MQTT/Backend) |

