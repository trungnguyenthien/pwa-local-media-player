# PWA Video Player (Local Media) 🎬

Trình phát video cục bộ đa nền tảng dạng **Progressive Web App (PWA)**, cho phép phát trực tiếp các tệp video từ máy tính và điện thoại của bạn với trải nghiệm mượt mà, riêng tư 100% và hoạt động độc lập ngay cả khi không có kết nối mạng (100% Offline).

[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://trungnguyenthien.github.io/pwa-local-media-player/)
[![PWA](https://img.shields.io/badge/PWA-Ready-blue.svg)](https://trungnguyenthien.github.io/pwa-local-media-player/)
[![Offline](https://img.shields.io/badge/Offline-100%25-orange.svg)](https://trungnguyenthien.github.io/pwa-local-media-player/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--side-success.svg)](https://trungnguyenthien.github.io/pwa-local-media-player/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

🌐 **Trải nghiệm ngay tại**: [https://trungnguyenthien.github.io/pwa-local-media-player/](https://trungnguyenthien.github.io/pwa-local-media-player/)

---

## 🌟 Điểm nổi bật & Tính năng chính

### 1. Riêng tư tuyệt đối & Hiệu năng cao (Privacy-First)
- **100% Client-side**: Video chạy trực tiếp trong trình duyệt qua Object URL (`URL.createObjectURL`), không tải file lên bất kỳ máy chủ nào.
- **Không tốn RAM**: Không nạp toàn bộ file vào bộ nhớ; trình duyệt tự động stream từng khối dữ liệu từ ổ cứng.
- **Quản lý bộ nhớ an toàn**: Tự động giải phóng Object URL cũ (`URL.revokeObjectURL`) ngay khi đổi file hoặc thoát màn hình để ngăn ngừa rò rỉ bộ nhớ.

### 2. Cử chỉ Touch thông minh trên màn hình (Smart Touch Gestures)
- **1 Touch = Play / Pause (Kèm cơ chế lùi 1s khi Replay)**:
  - Khi đang phát: Chạm 1 lần để tạm dừng.
  - Khi phát lại (Replay / Resume): Tự động **nhảy lùi 1 giây** trước khi phát lại, giúp bạn không bị lỡ ngữ cảnh hoặc lời thoại vừa ngắt quãng.
- **Double Touch bên trái = Lùi lại 5 giây (-5s)**: Chạm đúp nhanh ở nửa bên trái màn hình để tua lùi 5s kèm hiệu ứng sóng ripple trực quan.
- **Double Touch bên phải = Tiến tới 5 giây (+5s)**: Chạm đúp nhanh ở nửa bên phải màn hình để tua tới 5s.
- **Lọc cử chỉ thông minh**: Tự động phân biệt giữa chạm đơn, chạm đúp và thao tác cuộn/vuốt màn hình.

### 3. Trang "Video đã xem" (Watch History & Instant Replay)
- **Tự động chụp Thumbnail**: Trích xuất ảnh thu nhỏ video tự động qua HTML5 Canvas.
- **Lưu tiến trình xem**: Ghi nhớ thời lượng, vị trí xem dở (`currentTime`), phần trăm đã xem và thời điểm xem gần nhất qua **IndexedDB**.
- **Xem lại trực tiếp (Instant Replay)**:
  - Trên Chromium (Desktop & Android): Tích hợp **File System Access API** để lưu `FileSystemFileHandle`, cho phép mở lại trực tiếp file gốc từ máy chỉ với 1 click.
  - Tự động lưu cache Blob cho các tệp vừa và nhỏ (< 300MB).
  - Tự động tua đến đúng vị trí bạn đang xem dở trước đó khi mở lại file.
  - Hỗ trợ xoá từng video hoặc xoá toàn bộ lịch sử xem kèm hộp thoại xác nhận an toàn.

### 4. Đầy đủ bộ điều khiển chuyên nghiệp
- **Seek bar mượt mà**: Hiển thị thanh đệm dữ liệu (buffered bar), thời lượng `mm:ss` / `h:mm:ss` chuẩn `tabular-nums` chống giật layout, tooltip xem trước thời gian khi rê chuột.
- **Chủ động ẩn/hiện controls**: Thanh điều khiển và thanh tiêu đề luôn hiển thị cố định (không tự động biến mất), có nút bật/tắt chuyên dụng ở cạnh trái khi bạn muốn xem trọn vẹn toàn màn hình không bị che khuất.
- **Tốc độ phát**: Tuỳ chọn linh hoạt `0.5x`, `0.75x`, `1x`, `1.25x`, `1.5x`, `2x`.
- **Âm lượng & Tắt tiếng**: Thanh trượt âm lượng và nút bật/tắt tiếng nhanh (tự động ẩn thanh trượt trên màn hình cảm ứng theo quy chuẩn hệ thống).
- **Lặp lại (Loop)**: Bật/tắt chế độ lặp lại video đang phát.
- **Picture-in-Picture (PiP)**: Thu nhỏ video xem nổi trên các ứng dụng khác.
- **Toàn màn hình (Fullscreen)**: Tương thích Fullscreen API chuẩn và hỗ trợ `webkitEnterFullscreen` trên iOS Safari.

### 5. Tích hợp sâu vào hệ điều hành (OS Integrations)
- **Screen Wake Lock API**: Giữ màn hình thiết bị luôn sáng trong suốt quá trình phát video, tự động nhả khi tạm dừng hoặc kết thúc.
- **Media Session API**: Đồng bộ tên file, ảnh bìa và cho phép điều khiển play/pause/tua từ màn hình khóa, trung tâm điều khiển và tai nghe/bàn phím.
- **File Handlers (`launchQueue`)**: Cho phép chọn "Mở bằng PWA Video Player" từ trình quản lý file trên hệ điều hành desktop.

### 6. Phím tắt Desktop tiện lợi
| Phím tắt | Chức năng |
| :--- | :--- |
| `Space` hoặc `K` | Phát / Tạm dừng (Play / Pause) |
| `←` / `→` | Lùi / Tiến **5 giây** |
| `J` / `L` | Lùi / Tiến **10 giây** |
| `↑` / `↓` | Tăng / Giảm âm lượng 10% |
| `M` | Bật / Tắt âm thanh (Mute / Unmute) |
| `F` | Bật / Thoát toàn màn hình (Fullscreen) |
| `P` | Bật chế độ Picture-in-Picture |
| `Esc` | Đóng menu tốc độ hoặc thoát toàn màn hình |

---

## 📱 Chuẩn PWA & Khả năng tương thích di động

Ứng dụng được xây dựng tuân thủ nghiêm ngặt **PWA Standards**:

- **Manifest App ID chuẩn GitHub Pages**: Sử dụng `"id": "/pwa-local-media-player/"` giúp chống xung đột WebAPK và loại bỏ triệt để lỗi *"Ứng dụng này đã được cài đặt"* trên Android.
- **Tối ưu iOS Safari**:
  - Thẻ `apple-mobile-web-app-capable` và `apple-mobile-web-app-status-bar-style="black-translucent"` cho giao diện tràn viền sang trọng.
  - Tôn trọng vùng an toàn tai thỏ và thanh vuốt Home qua biến `env(safe-area-inset-*)`.
  - Hộp thoại hướng dẫn *"Thêm vào Màn hình chính"* 3 bước chuẩn iOS khi bấm nút Cài đặt.
- **Vô hiệu hóa Pull-to-Refresh**: Thuộc tính `overscroll-behavior-y: none` ngăn trình duyệt tự tải lại trang khi người dùng vuốt trên màn hình cảm ứng, bảo vệ phiên xem dở dang.
- **Nút "Cập nhật ứng dụng" chủ động**: Cho phép người dùng cập nhật phiên bản mới nhất ngay trên giao diện mà không phụ thuộc vào bộ nhớ đệm cũ của CDN hay trình duyệt.

---

## 🎞️ Định dạng hỗ trợ

Phụ thuộc vào bộ giải mã (codec) phần cứng của thiết bị và trình duyệt:
- **Tương thích tốt nhất**: `MP4` (H.264 + AAC), `WebM` (VP8/VP9 + Opus).
- **Hỗ trợ thêm tùy thiết bị**: `MOV`, `M4V`, `MKV`, `OGV`.
- **Xử lý lỗi thông minh**: Khi gặp video lỗi codec hoặc file hỏng, ứng dụng hiển thị thông báo rõ ràng kèm gợi ý định dạng tối ưu và nút chọn file khác.

---

## 📂 Cấu trúc thư mục

```
/
├── index.html              # Giao diện semantic HTML5, PWA meta tags & Material 3 components
├── styles.css              # Dark theme, Safe Area, responsive grid, animations & overscroll
├── app.js                  # Logic phát video, cử chỉ touch, IndexedDB, phím tắt & Service Worker
├── sw.js                   # Service Worker precache, cache-first, scope isolation & offline
├── manifest.webmanifest    # W3C Web App Manifest với id chuẩn subpath & file handlers
├── icons/
│   ├── icon-192.png        # Icon 192x192 cho Android/iOS
│   ├── icon-512.png        # Icon 512x512 độ phân giải cao
│   └── icon-maskable-512.png # Icon Maskable 512x512 tự động bo góc trên Android
└── Spec PWA Video Player (file local).md # Bản đặc tả kỹ thuật chi tiết
```

---

## 🚀 Cài đặt & Chạy cục bộ

Dự án sử dụng **Pure Vanilla HTML/CSS/JavaScript**, không cần Node.js, không cần bước build, không có dependencies bên thứ ba:

1. **Clone repository**:
   ```bash
   git clone git@github.com:trungnguyenthien/pwa-local-media-player.git
   cd pwa-local-media-player
   ```

2. **Chạy máy chủ cục bộ** (Service Worker yêu cầu HTTPS hoặc `localhost`):
   - Bằng Python 3:
     ```bash
     python3 -m http.server 8080
     ```
   - Bằng Node.js:
     ```bash
     npx serve .
     ```

3. Mở trình duyệt và truy cập `http://localhost:8080`.

---

## 📄 Bản quyền & Đóng góp

Dự án được phân phối theo giấy phép MIT License. Mọi ý kiến đóng góp hoặc báo lỗi (Issues / Pull Requests) đều được chào đón!

