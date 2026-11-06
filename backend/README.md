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

