# Cổng Quản Trị Trung Tâm (Super Admin Console)

Ứng dụng quản trị nội bộ dành riêng cho tài khoản **Super Admin**, kết nối trực tiếp với hệ thống **Web Du An Ca Nhan API** để xác thực tập trung, quản lý toàn bộ tài khoản người dùng, phân quyền đa dịch vụ (multi-service RBAC) và xây dựng nền tảng điều hướng phân module sẵn sàng tích hợp các dịch vụ mới trong tương lai.

---

## Xác nhận Quyết định & Phạm vi

> [!IMPORTANT]
> Toàn bộ các lựa chọn ưu tiên của bạn đã được tổng hợp vào kế hoạch bên dưới. Nếu bạn muốn điều chỉnh tên hiển thị của cổng quản trị hoặc cấu trúc module mở rộng, hãy phản hồi trước khi tiến hành xây dựng.

- **Máy chủ API mặc định**: Mặc định kết nối Staging (`https://be.quickgg.top`), đồng thời cho phép chuyển nhanh sang Local (`http://localhost:8080`) hoặc nhập URL máy chủ tùy chỉnh ngay tại màn hình đăng nhập.
- **Chế độ màu sắc**: Hỗ trợ chuyển đổi mượt mà giữa **Giao diện Sáng (Light)** và **Giao diện Tối (Dark)**, tự động lưu lựa chọn trên trình duyệt.
- **Quyền truy cập bắt buộc**: Chỉ tài khoản có `isSuperAdmin === true` mới được cấp phiên vào hệ thống; mọi tài khoản thường đăng nhập đúng mật khẩu vẫn sẽ bị từ chối truy cập kèm thông báo rõ ràng.
- **Bộ tính năng phiên bản đầu tiên**:
  1. Đăng nhập Super Admin & quản lý phiên JWT.
  2. Quản lý danh sách tài khoản, tìm kiếm/lọc đa tiêu chí, xem chi tiết và gán/cập nhật/gỡ Role theo từng Service.
  3. Tạo tài khoản mới ngay trong trang quản trị (`POST /v1/account/register`) mà không làm mất phiên đăng nhập của Super Admin.
  4. Màn hình tra cứu danh mục Role theo từng Service (`GET /v1/account/roles`).
  5. Kiến trúc Sidebar phân module theo registry để cắm thêm các module dịch vụ tương lai (như `Videos Manage`, quản lý cấu hình...) mà không cần viết lại khung ứng dụng.

---

## 1. Tổng quan & Giá trị Cốt lõi

- **Ứng dụng làm gì**: Cung cấp giao diện vận hành trực quan thay thế cho việc thao tác thủ công trên Swagger UI đối với toàn bộ 7 endpoint của module `account` (đăng nhập, đăng ký, liệt kê tài khoản, xem chi tiết theo ID, tra cứu danh mục role, gán/cập nhật role và gỡ role theo dịch vụ).
- **Đối tượng sử dụng**: Quản trị viên tối cao (**Super Admin**) chịu trách nhiệm cấp phát tài khoản, kiểm soát quyền truy cập giữa các dịch vụ trong hệ sinh thái và theo dõi cấu trúc phân quyền.
- **Giá trị chính**: Rút ngắn thao tác phân quyền đa dịch vụ xuống còn vài cú nhấp chuột, giảm sai sót nhập mã `serviceCode`/`role` nhờ đồng bộ trực tiếp với danh mục Role Catalog từ API, và đặt nền móng giao diện sạch sẽ để mở rộng sang các phân hệ quản trị nội dung về sau.

---

## 2. Trải nghiệm Người dùng & Thiết kế Giao diện

### Luồng thao tác chính (Key User Flows)

1. **Cổng Xác thực Super Admin**:
   - Người dùng mở ứng dụng sẽ thấy màn hình đăng nhập tối giản, chia bố cục rõ ràng với bộ chọn máy chủ API (Staging `be.quickgg.top` / Local `localhost:8080` / Tùy chỉnh) và nút chuyển đổi Sáng/Tối.
   - Nhập `usernameOrEmail`, `password` (và tùy chọn `serviceCode` nếu cần kiểm thử token theo dịch vụ).
   - Khi API trả về `AuthResponse`, hệ thống kiểm tra `account.isSuperAdmin === true`. Nếu hợp lệ, lưu `accessToken` và thông tin phiên, điều hướng vào không gian quản trị. Nếu không phải Super Admin, hệ thống huỷ ngay token trong bộ nhớ và hiển thị cảnh báo từ chối quyền truy cập.

2. **Quản lý Tài khoản & Phân quyền Đa dịch vụ**:
   - **Thanh tổng quan gọn gàng**: Hiển thị các chỉ số thực tế rút ra trực tiếp từ dữ liệu API (`Tổng tài khoản`, `Super Admin`, `Đang hoạt động`, `Số dịch vụ có phân quyền`).
   - **Thanh công cụ lọc & tìm kiếm**: Tìm nhanh theo tên đăng nhập, họ tên, email hoặc ID; lọc theo trạng thái (`Tất cả`, `ACTIVE`, khác) và lọc theo mã dịch vụ (`serviceCode`) hiện có.
   - **Bảng dữ liệu mật độ cao (High-Density Data Grid)**: Hiển thị ID (canh phải, số tabular), thông tin tài khoản (Username · Họ tên · Email), trạng thái kèm nhãn chữ rõ ràng, tóm tắt các cặp `Service / Role`, ngày tạo và thao tác mở chi tiết.
   - **Ngăn kéo Chi tiết & Phân quyền (Account Inspector Drawer)**: Khi chọn một tài khoản, hệ thống gọi `GET /v1/account/{id}` để đảm bảo dữ liệu mới nhất. Quản trị viên có thể:
     - Xem toàn bộ quyền hiện tại theo từng dịch vụ dưới dạng danh sách có cấu trúc rõ ràng.
     - **Gán / Cập nhật Role** (`PUT /v1/account/{id}/roles`): Chọn `serviceCode` và `role` từ danh mục Role Catalog (hoặc nhập mã tùy chỉnh nếu backend chưa khai báo), cập nhật ngay lập tức vào giao diện.
     - **Gỡ Role** (`DELETE /v1/account/{id}/roles/{serviceCode}`): Xác nhận inline an toàn trước khi gọi API xóa quyền trên dịch vụ đó.

3. **Tạo Tài khoản Mới trong Trang Quản trị**:
   - Nút hành động chính **"Tạo tài khoản"** trên thanh công cụ mở ngăn kéo/hộp thoại nhập `username` (4–50 ký tự), `password` (tối thiểu 6 ký tự, có nút ẩn/hiện và tạo mật khẩu nhanh), `fullName`, `email` và tùy chọn `serviceCode` ban đầu (gợi ý từ Role Catalog).
   - Khi gửi `POST /v1/account/register` thành công, ứng dụng giữ nguyên token của Super Admin hiện tại, đóng hộp thoại, làm mới danh sách tài khoản và hiện thông báo xác nhận.

4. **Danh mục Vai trò theo Dịch vụ (Roles Catalog)**:
   - Gọi `GET /v1/account/roles` để hiển thị Vai trò toàn cục (`globalRole`, ví dụ `SUPER_ADMIN`) và toàn bộ bản đồ các dịch vụ kèm danh sách vai trò hợp lệ (`serviceRoles`).
   - Hỗ trợ lọc trực tiếp theo `serviceCode` (gọi lại API với query `serviceCode` hoặc lọc tức thì), đồng thời có nút chuyển nhanh sang màn hình Tài khoản đã lọc sẵn theo dịch vụ đó để xem ai đang giữ quyền.

5. **Khung Module Mở rộng (Extensible Workspace)**:
   - Thanh bên chia thành hai nhóm rõ ràng: **Quản trị cốt lõi** (`Tài khoản`, `Danh mục Role`) và **Hệ sinh thái dịch vụ** (cấu trúc khai báo tập trung để đăng ký thêm các module tương lai như `Videos Manage` mà không làm rối thanh điều hướng). Các module chưa triển khai hiển thị trạng thái kiến trúc rõ ràng, không tạo nút bấm chết.

### Bản sắc Hình ảnh & Hệ thống Chủ đề

- **Phong cách thẩm mỹ**: Utilitarian Enterprise Console (tối giản, chính xác, không trang trí thừa), tuân thủ kỷ luật bề mặt phẳng một tầng độ sâu (single-elevation) với viền hairline `1px` thay vì lồng thẻ trong thẻ hay đổ bóng nặng.
- **Bảng màu 60-30-10 & Dual-Theme (Sáng / Tối)**:
  - *Chế độ Sáng*: Nền canvas trắng ngà mát (`#F8FAFC`), bề mặt bảng và sidebar trắng tinh (`#FFFFFF`), viền hairline `#E2E8F0`, chữ chính `#0F172A`, chữ phụ `#475569`.
  - *Chế độ Tối*: Nền canvas slate sâu (`#090D16`), bề mặt panel `#0F172A`, viền hairline `#1E293B`, chữ chính `#F1F5F9` (tối ưu độ tương phản quang học), chữ phụ `#94A3B8`.
  - *Màu nhấn (10% Accent)*: Xanh Cobalt (`#2563EB` ở Light / `#3B82F6` ở Dark) dùng duy nhất cho nút hành động chính, mục điều hướng đang chọn và focus ring.
  - *Màu ngữ nghĩa*: Xanh lá (`#16A34A` — Hoạt động / Thành công), Hổ phách (`#D97706` — Cảnh báo / Tạm khóa), Đỏ thẫm (`#DC2626` — Lỗi / Gỡ quyền) luôn đi kèm nhãn chữ rõ ràng.
- **Typography & Số học Tabular**:
  - Tiêu đề & điều hướng: `Plus Jakarta Sans` (hỗ trợ hoàn chỉnh dấu tiếng Việt, sắc nét ở cỡ trung bình và lớn).
  - Nội dung & bảng dữ liệu: `Public Sans` (tối ưu độ dễ đọc cho văn bản mật độ cao 13px–14px).
  - Dữ liệu kỹ thuật (`ID`, `serviceCode`, `createdAt`, bộ đếm): `JetBrains Mono` kết hợp `tabular-nums` để canh thẳng hàng theo cột.
- **Kỷ luật Anti-Slop**: Không bọc metadata tĩnh trong pill/chip màu sặc sỡ (hiển thị dạng văn bản sạch phân tách bằng dấu `·` hoặc cột cấu trúc rõ ràng); không dùng chấm tròn nhấp nháy trang trí, không dùng viền trái dày `border-l-4`, không tạo số liệu giả hay thanh trạng thái hệ thống ảo.
- **Phản hồi tương tác & Chuyển động**: Chuyển đổi trạng thái hover/drawer mượt dưới `200ms`, khung xương loading (skeleton) khớp chiều cao hàng bảng, trạng thái rỗng rõ ràng, thông báo toast gọn nhẹ cho mọi thao tác tạo/gán/gỡ quyền và tự động xử lý hết hạn phiên `401`.

---

## 3. Quyết định Sản phẩm & Kiến trúc Quan trọng

- **Quyết định 1 — Chiến lược kết nối API đa môi trường (Staging & Local)**:
  - *Phương án chọn*: Chạy một máy chủ Express trung gian nhẹ cùng ứng dụng với route proxy `/api/proxy/*` để chuyển tiếp yêu cầu tới máy chủ Staging (`https://be.quickgg.top`) hoặc URL HTTPS từ xa, đồng thời tự động gọi trực tiếp từ trình duyệt khi người dùng chọn `http://localhost:8080` / `127.0.0.1`.
  - *Lý do*: Trình duyệt trên môi trường web preview thường gặp lỗi CORS khi gọi trực tiếp sang domain Staging (`be.quickgg.top`). Proxy phía server loại bỏ hoàn toàn rào cản CORS mà vẫn giữ nguyên header `Authorization: Bearer <token>`. Ngược lại, `localhost:8080` chạy trên máy cá nhân của lập trình viên nên phải gọi trực tiếp từ trình duyệt mới tiếp cận được.
  - *Phương án đã cân nhắc*: Gọi thẳng từ trình duyệt cho mọi server (dễ bị chặn CORS trên Staging) hoặc proxy mọi yêu cầu qua server (không thể truy cập `localhost:8080` trên máy người dùng).

- **Quyết định 2 — Cơ chế bảo vệ Super Admin & quản lý phiên JWT**:
  - *Phương án chọn*: Kiểm tra kép cả lúc đăng nhập (`account.isSuperAdmin === true`) lẫn khi khởi phục phiên, lưu phiên tối thiểu trong `localStorage` kèm thời điểm hết hạn tính từ `expiresIn` (giây). Mọi phản hồi `401 Unauthorized` hoặc `403 Forbidden` từ backend đều tự động đăng xuất an toàn và hiển thị lý do trên màn hình đăng nhập.
  - *Lý do*: Đảm bảo tuân thủ tuyệt đối yêu cầu chỉ Super Admin được truy cập, đồng thời không bị kẹt màn hình trắng khi JWT hết hạn.

- **Quyết định 3 — Kiến trúc Sidebar & Module Registry sẵn sàng mở rộng**:
  - *Phương án chọn*: Khai báo danh sách phân hệ quản trị bằng một cấu hình tập trung (Module Registry) gồm `id`, `group`, `label`, `icon`, `status` (`active` | `planned`) và component màn hình tương ứng.
  - *Lý do*: Khi bạn bổ sung Swagger của các module mới (như `videos-manage`, v.v.) ở các bước tiếp theo, chỉ cần đăng ký thêm module vào cấu hình này là thanh điều hướng, breadcrumb và vùng nội dung chính tự động tích hợp đồng bộ.

---

## 4. Kiến trúc Kỹ thuật & Luồng Dữ liệu *(Tài liệu Tham khảo Kỹ thuật)*

### Sơ đồ Kiến trúc & Phân cấp Thành phần

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Trình duyệt (React SPA)                          │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│  │  Theme & Auth State │  │  Server Config      │  │  Module Registry │  │
│  │  (Light/Dark, JWT,  │  │  (Staging / Local / │  │  (Accounts,      │  │
│  │   SuperAdmin Guard) │  │   Custom Base URL)  │  │   Roles, Future) │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └────────┬─────────┘  │
│             │                        │                      │            │
│             ▼                        ▼                      ▼            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                       Lớp Giao diện (UI Shell)                     │  │
│  │  ┌───────────────────┐   ┌──────────────────────────────────────┐  │  │
│  │  │ Chưa đăng nhập:   │   │ Đã xác thực (isSuperAdmin === true): │  │  │
│  │  │ Màn hình Login +  │   │ • Sidebar 248px (Module Groups)      │  │  │
│  │  │ Chọn Server +     │   │ • Top Bar (Breadcrumb + Primary CTA) │  │  │
│  │  │ Chặn Non-Admin    │   │ • Views:                             │  │  │
│  │  │                   │   │   ├─ Quản lý Tài khoản + Bộ lọc      │  │  │
│  │  │                   │   │   │  ├─ Drawer Chi tiết & Gán/Gỡ Role│  │  │
│  │  │                   │   │   │  └─ Modal Tạo tài khoản mới      │  │  │
│  │  │                   │   │   ├─ Danh mục Role theo Service      │  │  │
│  │  │                   │   │   └─ Khung Module Mở rộng (Planned)  │  │  │
│  │  └───────────────────┘   └──────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │ API Client (Bearer JWT)             │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            │ Remote HTTPS (Staging)                          │ Localhost
            ▼                                                 ▼
┌──────────────────────────────┐                  ┌────────────────────────┐
│ Express Proxy (/api/proxy/*) │                  │ Trình duyệt gọi thẳng  │
│ Chuyển tiếp + giữ Authorization                 │ http://localhost:8080  │
└──────────────┬───────────────┘                  └───────────┬────────────┘
               │                                              │
               ▼                                              ▼
     https://be.quickgg.top                           Local Backend API
   (/v1/account/* OpenAPI 3.1.0)                 (/v1/account/* OpenAPI 3.1.0)
```

### Mô hình Dữ liệu & Trạng thái Chính

- **AuthSession**: `accessToken`, `tokenType` (`Bearer`), `expiresAt` (mốc thời gian tính từ `expiresIn`), `currentService`, `currentRole`, `account` (`AccountResponse` với `isSuperAdmin === true`).
- **AccountResponse**: `id`, `username`, `email`, `fullName`, `isSuperAdmin`, `status`, `serviceRoles` (`Record<string, string>`), `createdAt`.
- **ServiceRolesCatalogResponse**: `globalRole` (`SUPER_ADMIN`), `serviceRoles` (`Record<string, string[]>`).
- **ApiEnvironmentConfig**: `preset` (`staging` | `local` | `custom`), `baseUrl`, `useProxy` (tự động bật cho remote URL, tắt cho `localhost`/`127.0.0.1`).

### Ánh xạ Tương tác & Xử lý Trạng thái

- **Đăng nhập (`POST /v1/account/login`)**: Validate trường bắt buộc -> gửi yêu cầu -> kiểm tra `account.isSuperAdmin === true` -> nếu sai quyền hiển thị banner từ chối rõ ràng -> nếu hợp lệ nạp đồng thời danh sách tài khoản và danh mục Role.
- **Danh sách & Bộ lọc (`GET /v1/account`)**: Nạp dữ liệu với trạng thái skeleton -> hỗ trợ tìm kiếm tức thời theo `username`/`email`/`fullName`/`id`, lọc theo `status`, lọc theo `serviceCode`, và nút làm mới dữ liệu thủ công.
- **Xem chi tiết & Phân quyền (`GET /v1/account/{id}`, `PUT /v1/account/{id}/roles`, `DELETE /v1/account/{id}/roles/{serviceCode}`)**: Mở ngăn kéo chi tiết gọi lại bản ghi mới nhất -> form gán role chọn từ Role Catalog (hoặc tự nhập mã dịch vụ/role mới) -> thao tác gỡ role có bước xác nhận tại chỗ -> đồng bộ trực tiếp bản ghi vừa cập nhật vào bảng danh sách mà không gây giật giao diện.
- **Tạo tài khoản (`POST /v1/account/register`)**: Validate độ dài `username` (4–50), `password` (≥ 6), định dạng `email` -> gọi API tạo tài khoản (bỏ qua token trả về của tài khoản mới để bảo toàn phiên Super Admin) -> tự động tải lại danh sách tài khoản và mở thông báo thành công.
- **Tra cứu Danh mục Role (`GET /v1/account/roles`)**: Nạp toàn bộ catalog hoặc lọc theo query `serviceCode` -> hiển thị cấu trúc Role toàn cục và từng dịch vụ -> cho phép nhấn vào từng dịch vụ để chuyển thẳng sang bảng Tài khoản đã lọc theo dịch vụ đó.
- **Phục hồi lỗi**: Phân tách rõ lỗi mạng/CORS (gợi ý kiểm tra URL server hoặc bật/tắt proxy), lỗi `401/403` (hết phiên hoặc không đủ quyền Super Admin), và lỗi nghiệp vụ `400/409` từ backend (trùng username/email, sai mật khẩu).
