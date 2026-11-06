# Smart Farm Mini — Documentation

Tài liệu kỹ thuật, sơ đồ kiến trúc và hướng dẫn vận hành hệ thống Smart Farm Mini.

## 1. Mục lục tài liệu
- **`architecture/`**: Tài liệu thiết kế kiến trúc hệ thống, Clean Architecture, luồng dữ liệu IoT và mô hình triển khai.
- **`diagrams/`**: Các sơ đồ thiết kế hệ thống bao gồm:
  - Sơ đồ khối tổng thể (System Overview).
  - Sơ đồ quan hệ thực thể (ERD).
  - Sơ đồ tuần tự điều khiển bơm và tiếp nhận dữ liệu cảm biến (Sequence Diagrams).
  - Sơ đồ phần cứng và đấu nối chân ESP32 (Wiring Diagram). 

## 2. Kiến trúc tổng thể
```text
[Sensors + Pump] <--> [ESP32] <--(MQTT)--> [EMQX Broker]
                                                |
                                        (MQTT BackgroundService)
                                                v
                                    [ASP.NET Core Web API]
                                         |         |
                              (EF Core)  |         |  (SignalR Hub)
                                         v         v
                                   [SQL Server]  [React Dashboard]
```

