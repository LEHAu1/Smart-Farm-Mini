# Smart Farm Mini

An IoT-based smart plant monitoring and automatic irrigation system.

## Technology Stack

### Backend
- C#
- ASP.NET Core Web API
- Clean Architecture
- Entity Framework Core
- SQL Server
- MQTT
- SignalR

### Frontend
- React
- TypeScript
- Tailwind CSS

### IoT
- ESP32
- Soil Moisture Sensor
- DHT22
- DS18B20
- OLED Display
- Water Pump

## Architecture

```text
smart-farm-mini/
|-- backend/
|   |-- SmartFarm.API/
|   |-- SmartFarm.Application/
|   |-- SmartFarm.Domain/
|   |-- SmartFarm.Infrastructure/
|   `-- SmartFarm.UnitTests/
|-- frontend/
|   `-- smartfarm-web/
|-- firmware/
|   |-- esp32-controller/
|   `-- esp32-camera/
|-- database/
|-- docs/
|   `-- design/stitch/
|-- Smart_Farm_Mini.slnx
`-- README.md
```

The backend retains its Clean Architecture projects. `SmartFarm.WebAPI` has
been moved to `backend/SmartFarm.API` and its project file renamed to
`SmartFarm.API.csproj`; existing C# namespaces remain unchanged.

The frontend has a React + TypeScript + Vite scaffold with page routing;
see `frontend/smartfarm-web/README.md` for setup. Firmware and database
directories are placeholders for future implementation. The camera module is
reserved; its behavior is defined in the project backlog but not implemented.
Most backend modules are currently scaffolding rather than implemented features.

## Backend Commands

Run from the repository root with the .NET 10 SDK installed:

```sh
dotnet restore Smart_Farm_Mini.slnx
dotnet build Smart_Farm_Mini.slnx
dotnet run --project backend/SmartFarm.API/SmartFarm.API.csproj
```

## Frontend Design Workflow

1. Export screen code and assets from Stitch into `docs/design/stitch/`.
2. Implement the React application in `frontend/smartfarm-web/`.
3. Start with mock data, then integrate confirmed backend APIs and SignalR events.

## Team

Smart Farm Mini Team
