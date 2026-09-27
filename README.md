# Thanh Thiện Dispatch

Ứng dụng điều hành nhà xe gồm đặt vé, quản lý chuyến, khách hàng, tài xế, phương tiện, ký gửi, bảng giá và báo cáo.

## Yêu cầu

- Node.js 20.9 trở lên
- npm
- SQLite cho môi trường phát triển

## Khởi động

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Mở `http://localhost:3000`. Các biến môi trường được đặt trong `.env`:

```dotenv
DATABASE_URL="file:./dev.db"
SERPAPI_KEY=""
ESMS_API_KEY=""
ESMS_SECRET_KEY=""
ESMS_BRANDNAME=""
ESMS_SANDBOX="1"
ESMS_CONTENT_OVERRIDE=""
```

Giữ `ESMS_SANDBOX="1"` khi kiểm tra tích hợp (không gửi thật, không tính phí). `ESMS_CONTENT_OVERRIDE` cho phép dùng chính xác mẫu cố định của Brandname test; phải để trống khi chuyển sang mẫu xác nhận vé production. Sau khi eSMS đã duyệt Brandname và mẫu `BOOKING_CONFIRMATION`, đổi sandbox thành `0` để gửi thật. API Key và Secret Key chỉ đặt trong `.env` trên máy chủ, không đưa vào Git hoặc mã nguồn.

Lần truy cập đầu tiên, hệ thống chuyển đến `/login` và yêu cầu khởi tạo tài khoản quản trị. Không có mật khẩu mặc định. Mật khẩu phải dài tối thiểu 10 ký tự, có chữ và số.

Đường dẫn SQLite tương đối được Prisma tính từ thư mục `prisma`, vì vậy database phát triển chính là `prisma/dev.db`. Tuyệt đối không tự động xóa hoặc thay đổi các database hiện có (`dev.db` ở thư mục gốc và `prisma/dev.db`). Các thao tác thử nghiệm schema hoặc chạy kiểm thử phải sử dụng database dùng một lần (disposable DB) riêng biệt để đảm bảo an toàn dữ liệu.

## Kiểm tra trước khi phát hành

```powershell
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Lưu ý vận hành

- Việc tạo booking sử dụng transaction; ghế được khóa bởi unique constraint trong database.
- Sơ đồ ghế được dùng chung giữa giao diện và server; vé khứ hồi phải chọn và khóa ghế cho cả hai chiều.
- Session đăng nhập được lưu trong database; trình duyệt chỉ giữ token ngẫu nhiên trong cookie `httpOnly` có thời hạn 12 giờ.
- Trang cài đặt chỉ dành cho `ADMIN`; quản lý tài xế và phương tiện dành cho `DISPATCHER` hoặc `ADMIN`.
- Tạo, cập nhật, hủy booking và đối soát tiền mặt được ghi vào `AuditLog`.
- Quản trị tài khoản tại `/settings/accounts`; hệ thống không cho người dùng tự khóa mình hoặc khóa quản trị viên hoạt động cuối cùng.
- Nhật ký 200 thao tác gần nhất nằm tại `/settings/audit`; người dùng đổi mật khẩu tại `/profile`.
- Đổi hoặc đặt lại mật khẩu sẽ hủy các session cũ của tài khoản đó.
- Giá vé, ngày lễ, lịch chạy và mẫu SMS được kiểm tra phía server và các thay đổi cấu hình quan trọng được ghi audit.
- Mỗi trạng thái `PAID` phải có bút toán `Payment`; báo cáo tách giá trị vé đã bán, tiền thực thu và công nợ.
- Hệ thống không tự gán một phương tiện cho hai chuyến cùng giờ; nếu thiếu xe, nhân viên phải điều chỉnh lịch hoặc bổ sung xe.
- Mọi mức giá được tính lại phía server. Không lấy tổng tiền do trình duyệt gửi lên làm nguồn dữ liệu chuẩn.
- SMS xác nhận đặt vé được gửi qua eSMS và lưu trạng thái `SENT`/`FAILED` trong nhật ký. `SENT` nghĩa là eSMS đã tiếp nhận yêu cầu; trạng thái phát đến thuê bao cần callback của eSMS nếu triển khai đối soát cuối cùng.
- Trợ lý cuộc gọi hiện là trình mô phỏng, chưa phải tích hợp tổng đài hoặc speech-to-text thật.
- Khi thêm tài khoản nhân viên, chỉ lưu mật khẩu đã băm bằng bcrypt; không nhập mật khẩu rõ trực tiếp vào database.
- SQLite phù hợp chạy thử hoặc một máy đơn. Khi nhiều tổng đài viên thao tác đồng thời, nên chuyển sang PostgreSQL.

## Sao lưu

Tắt tiến trình ứng dụng trước khi sao lưu rồi sao chép `prisma/dev.db` sang nơi an toàn. Không dùng tệp `dev.db` ở thư mục gốc làm database chính (đây là tệp lưu trữ cục bộ/legacy được giữ nguyên). Tuyệt đối không tự động xóa hay ghi đè bất kỳ tệp database hiện có nào (`dev.db` hoặc `prisma/dev.db`); mọi thao tác thay đổi schema hoặc kiểm thử tự động phải sử dụng database dùng một lần (disposable DB) riêng biệt.
