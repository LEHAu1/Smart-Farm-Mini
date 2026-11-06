# Smart Farm Mini — ESP32 Camera Firmware

Mã nguồn nhúng chạy trên module ESP32-CAM để giám sát thị giác cây trồng.

## 1. Phần cứng
- **Module:** ESP32-CAM (AI-Thinker)
- **Cảm biến hình ảnh:** Camera OV2640 (2MP)
- **Thẻ nhớ:** Khe cắm thẻ MicroSD lưu ảnh cục bộ

## 2. Chức năng chính
- Định kỳ chụp ảnh cây trồng gửi về Backend để lưu trữ dòng thời gian sinh trưởng (Time-lapse growth).
- Cung cấp luồng video trực tiếp (MJPEG Stream) khi người dùng mở Dashboard quan sát chậu cây.

