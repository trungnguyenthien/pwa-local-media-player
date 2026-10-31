# Spec: PWA Video Player (file local)

## 1. Mục tiêu

Xây dựng một PWA phát video từ file có sẵn trên máy người dùng, với các chức năng cơ bản như những trình phát video thông thường. Mỗi lần chỉ phát một file. Toàn bộ chạy phía client, không backend, không upload file đi đâu, dùng được offline sau lần mở đầu tiên.

## 2. Phạm vi

**Có trong phạm vi:**

- Chọn một file video từ máy (và kéo thả trên desktop).
- Phát video với đầy đủ điều khiển cơ bản.
- Cài được lên màn hình chính Android, iOS và desktop; chạy offline.

**Ngoài phạm vi (không làm):**

- Playlist, hàng đợi, phát nhiều file cùng lúc.
- Phụ đề, chọn audio track, chuyển mã (transcode) video.
- Phát từ URL, cloud, streaming.
- Lưu thư viện video trong app.

## 3. Công nghệ

- HTML + CSS + JavaScript thuần (ES6), không framework, không bước build.
- Phát video bằng thẻ `<video>` HTML5 gốc của trình duyệt.
- Service Worker + Web App Manifest cho PWA.
- Comment trong code viết bằng tiếng Anh.
- Giao diện theo Material Design, responsive, ưu tiên mobile.

## 4. Định dạng được hỗ trợ

App không tự giải mã mà phụ thuộc vào codec của trình duyệt/thiết bị.

- Mặc định nhận: `video/*` và các đuôi `.mp4, .m4v, .mov, .webm, .ogv, .mkv`.
- Tương thích tốt nhất: MP4 (H.264 + AAC), WebM (VP8/VP9 + Opus).
- H.265/HEVC: chạy trên Safari iOS/macOS, trên Chrome tùy phần cứng.
- MKV, AVI: tùy trình duyệt, nhiều trường hợp không phát được.
- Khi file không phát được (sự kiện `error` của video hoặc `canPlayType` trả về rỗng), hiện thông báo rõ ràng: "Thiết bị này không hỗ trợ định dạng/codec của file" kèm nút chọn file khác.

## 5. Luồng sử dụng

1. Mở app, thấy màn hình trống với nút lớn **Chọn video** (và vùng kéo thả trên desktop).
2. Chọn file, app chuyển sang màn hình phát và tự phát (nếu bị chặn autoplay thì hiện nút play lớn ở giữa).
3. Trong lúc phát, người dùng điều khiển bằng thanh control.
4. Bấm nút **Mở file khác** để chọn file mới. File mới thay thế file cũ hoàn toàn (một file tại một thời điểm).

## 6. Giao diện

### 6.1. Màn hình trống

- Tiêu đề app, nút **Chọn video**, dòng gợi ý các định dạng thường dùng.
- Desktop: vùng kéo thả, có highlight khi kéo file vào.

### 6.2. Màn hình phát

- Video chiếm toàn bộ vùng hiển thị, giữ tỉ lệ gốc (letterbox nền đen).
- Thanh trên: nút Mở file khác, tên file (cắt bớt bằng dấu ba chấm nếu dài).
- Thanh dưới: seek bar, thời gian, các nút điều khiển.
- Controls tự ẩn sau 3 giây không tương tác khi đang phát; chạm hoặc di chuột để hiện lại. Khi tạm dừng thì luôn hiện.
- Hỗ trợ cả dọc và ngang (không khóa orientation).

## 7. Chức năng điều khiển

| Chức năng | Mô tả |
| --- | --- |
| Play / Pause | Nút chính; chạm vào vùng video cũng bật/tắt |
| Seek bar | Kéo để tua; hiện vùng buffered; hiện thời gian khi kéo |
| Thời gian | `hiện tại / tổng` dạng `mm:ss` hoặc `h:mm:ss` |
| Tua nhanh/lùi | Nút ±10 giây; double tap nửa trái/phải màn hình trên mobile |
| Âm lượng | Thanh trượt và nút mute (ẩn thanh trượt trên iOS vì hệ thống kiểm soát âm lượng bằng nút cứng) |
| Tốc độ phát | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x |
| Fullscreen | Vào/thoát toàn màn hình |
| Lặp lại | Bật/tắt loop cho file đang phát |
| Picture-in-Picture | Hiện nút nếu trình duyệt hỗ trợ |
| Kết thúc video | Dừng ở cuối, hiện nút Phát lại |

### Phím tắt (desktop)

- `Space` hoặc `K`: play/pause
- `←` / `→`: lùi/tiến 5 giây; `J` / `L`: lùi/tiến 10 giây
- `↑` / `↓`: tăng/giảm âm lượng
- `M`: mute, `F`: fullscreen, `P`: PiP

### Tích hợp hệ thống

- **Media Session API**: hiện tên file trên màn hình khóa/thông báo, hỗ trợ play/pause và tua từ điều khiển hệ thống.
- **Screen Wake Lock API**: giữ màn hình sáng khi đang phát, nhả khi pause hoặc kết thúc (bỏ qua nếu không hỗ trợ).

## 8. Xử lý file

- Chọn file bằng `<input type="file" accept="video/*,.mkv">`.
- Kéo thả: lắng nghe `dragover` và `drop` trên toàn trang; chỉ nhận file đầu tiên, bỏ qua các file còn lại.
- Tạo nguồn phát bằng `URL.createObjectURL(file)`.
- **Một file mỗi lần**: trước khi nạp file mới phải `pause()`, gọi `URL.revokeObjectURL()` cho URL cũ, rồi mới gán `src` mới, để tránh rò rỉ bộ nhớ.
- File không được sao chép hay lưu lại; đóng app là mất, lần sau chọn lại.
- Nếu người dùng chọn file không phải video, báo lỗi và giữ nguyên trạng thái hiện tại.

### Tùy chọn nâng cao (làm sau nếu cần)

- Chrome desktop: khai báo `file_handlers` trong manifest để có thể "Mở bằng" PWA từ hệ điều hành, xử lý bằng `launchQueue`.
- Nhớ vị trí đã xem: lưu `currentTime` vào `localStorage` theo khóa `name + size + lastModified`, hỏi "Tiếp tục từ mm:ss?" khi chọn lại đúng file.

## 9. Lưu ý theo nền tảng

- **iOS Safari/PWA**: bắt buộc `playsinline` trên thẻ video. Trên iPhone, Fullscreen API chỉ áp dụng cho chính thẻ video (dùng `webkitEnterFullscreen`), không dùng được với container tùy chỉnh, nên khi vào fullscreen sẽ dùng giao diện của hệ thống.
- **Autoplay**: trình duyệt có thể chặn tự phát có tiếng; vì file được chọn từ thao tác người dùng nên thường được phép, nếu bị chặn thì hiện nút play lớn.
- **Android Chrome**: hỗ trợ đầy đủ Fullscreen, PiP, Media Session.
- **Desktop**: hỗ trợ kéo thả và phím tắt.

## 10. PWA

### Manifest

- `name`, `short_name`, `start_url: "./"`, `scope: "./"`.
- `display: "standalone"`, `background_color` và `theme_color` tối.
- Icon 192x192, 512x512 và bản maskable.
- Không khóa `orientation`.

### Service Worker

- Chiến lược cache-first cho app shell (HTML, CSS, JS, icon, manifest).
- Cache theo phiên bản (`cache-v1`), xóa cache cũ khi `activate`.
- Chỉ cache tài nguyên của app, không động đến file video của người dùng.
- Khi có bản mới thì hiện thông báo "Có bản cập nhật, tải lại" để người dùng chủ động.

## 11. Cấu trúc thư mục

```
/
├─ index.html
├─ styles.css
├─ app.js
├─ sw.js
├─ manifest.webmanifest
└─ icons/
   ├─ icon-192.png
   ├─ icon-512.png
   └─ icon-maskable-512.png
```

## 12. Xử lý lỗi và trạng thái

- Chưa có file: màn hình trống.
- Đang tải metadata: hiện spinner.
- Đang buffering (`waiting`): hiện spinner trên video.
- Lỗi codec/định dạng (`MediaError` code 3 hoặc 4): thông báo như mục 4.
- File bị xóa hoặc không đọc được giữa chừng: thông báo "Không đọc được file" và quay về màn hình trống.
- Trình duyệt không hỗ trợ API tùy chọn (PiP, Wake Lock, Media Session): ẩn tính năng đó, không báo lỗi.

## 13. Yêu cầu phi chức năng

- Riêng tư: không gửi dữ liệu hay file ra ngoài, không analytics.
- Hiệu năng: khởi động dưới 1 giây khi đã cache; không đọc toàn bộ file vào RAM (dùng object URL để trình duyệt tự stream từ đĩa).
- Accessibility: nút có `aria-label`, điều khiển được bằng bàn phím, vùng chạm tối thiểu 44px.
- Chạy được khi mở bằng HTTPS hoặc `localhost` (yêu cầu của Service Worker).

## 14. Tiêu chí nghiệm thu

1. Chọn một file MP4 (H.264/AAC) và phát được trên Android Chrome, iOS Safari và desktop Chrome.
2. Chọn file thứ hai thì file đầu dừng và bị thay thế, không phát chồng.
3. Tất cả điều khiển ở mục 7 hoạt động; controls tự ẩn và hiện lại đúng.
4. File sai định dạng hoặc không có codec hiển thị thông báo lỗi dễ hiểu.
5. Cài lên màn hình chính được; tắt mạng vẫn mở app và phát file local.
6. Xoay màn hình không làm mất vị trí đang phát.
7. Không còn object URL cũ sau khi đổi file (kiểm tra qua DevTools Memory).
