# Smart Farm Mini — Backend

Thư mục và các dự án tầng nghiệp vụ Backend của hệ thống Smart Farm Mini.

## 1. Tổ chức mã nguồn
Backend được xây dựng theo chuẩn **Clean Architecture** (Onion Architecture), với Solution chính nằm tại thư mục gốc của repository:
- `Smart_Farm_Mini.slnx`

Các dự án thành phần gồm:
- **`SmartFarm.Domain`**: Core Entities, Enums, Constants, Domain Exceptions và Business Rules độc lập.
- **`SmartFarm.Application`**: Use Cases, DTOs, Contracts, Validators, Mappings.
- **`SmartFarm.Infrastructure`**: EF Core 10, SQL Server, Repositories, MQTT Client Service, SignalR Realtime.
- **`SmartFarm.WebAPI`**: REST API Controllers, Middlewares, DI Container, Swagger UI, Health Check.
- **`SmartFarm.UnitTests`**: Bộ kiểm thử tự động xUnit + Moq.

## 2. Hướng dẫn biên dịch
Tại thư mục gốc dự án:
```bash
dotnet restore Smart_Farm_Mini.slnx
dotnet build Smart_Farm_Mini.slnx
```

## 3. Cấu hình bí mật local
Backend không tự nạp file `.env`. Dùng .NET User Secrets từ thư mục gốc repository:
```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=SmartFarmMiniDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True" --project backend/SmartFarm.WebAPI/SmartFarm.WebAPI.csproj
$secretBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
$jwtKey = [Convert]::ToBase64String($secretBytes)
dotnet user-secrets set "JwtSettings:SecretKey" "$jwtKey" --project backend/SmartFarm.WebAPI/SmartFarm.WebAPI.csproj
```
Production phải cấp `ConnectionStrings__DefaultConnection` và `JwtSettings__SecretKey` từ secret store/environment; không ghi secret vào `appsettings*.json`.

