# Shop Acc Huy Trung

Website mua bán acc game **Free Fire** — có hệ thống người dùng & quản trị (admin),
bảo mật bằng JWT, thông báo qua Telegram, thanh toán qua mã QR VietQR.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Python 3.11 · FastAPI · SQLAlchemy ORM |
| CSDL | SQL Server (SSMS 20) — dễ chuyển sang Supabase/PostgreSQL sau này |
| Frontend | Next.js 16 (React 19) · TypeScript · Tailwind CSS 4 |
| Xác thực | JWT (access + refresh token), mật khẩu hash bcrypt |
| Tích hợp | VietQR (sinh mã QR chuyển khoản) · Telegram Bot (thông báo) |

## Cấu trúc dự án

```
shopacchuytrung/
├── backend/            FastAPI — API, models, nghiệp vụ
│   ├── app/
│   │   ├── models/         15 bảng SQLAlchemy
│   │   ├── schemas/        Pydantic schemas
│   │   ├── routers/        API endpoints (public + admin/)
│   │   ├── services/       Telegram, VietQR, upload ảnh, thông báo
│   │   ├── core/           Bảo mật JWT, phân quyền
│   │   ├── config.py       Cấu hình (đọc từ .env)
│   │   └── main.py         Khởi tạo app
│   ├── init_db.py          Tạo database + seed dữ liệu mặc định
│   ├── smoke_test.py       Kiểm thử API end-to-end
│   └── requirements.txt
└── frontend/           Next.js — giao diện người dùng & admin
    └── app/
        ├── components/     Header, Footer, AccountCard
        ├── lib/            API client, auth context, types
        ├── (các trang)     accounts, order, posts, guides, account...
        └── admin/          Khu vực quản trị
```

## 1. Chạy Backend

Yêu cầu: **Python 3.11+**, **SQL Server** + **ODBC Driver 17 for SQL Server**.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt

copy .env.example .env            # rồi mở .env chỉnh lại cho đúng
```

Cấu hình `backend/.env` — phần quan trọng:

```ini
# Nếu đăng nhập SQL Server bằng tài khoản Windows:
DB_TRUSTED_CONNECTION=true
DB_SERVER=localhost
DB_NAME=ShopAccHuyTrungDB

# Hoặc dùng SQL Server Authentication:
# DB_TRUSTED_CONNECTION=false
# DB_USERNAME=sa
# DB_PASSWORD=mat_khau_cua_ban

# Khóa bí mật JWT — sinh khóa mới:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
SECRET_KEY=...
```

Khởi tạo CSDL (tạo database + bảng + dữ liệu mẫu + tài khoản admin):

```bash
python init_db.py
```

Chạy server:

```bash
uvicorn app.main:app --reload --port 8000
```

- API chạy tại: `http://localhost:8000`
- Tài liệu API (Swagger UI): `http://localhost:8000/docs`
- Kiểm thử nhanh toàn bộ API: `python smoke_test.py`

**Tài khoản admin mặc định:** `admin` / `Admin@123456`
(đổi trong `.env` trước khi chạy `init_db.py`, hoặc đổi mật khẩu sau khi đăng nhập).

## 2. Chạy Frontend

Yêu cầu: **Node.js 20.9+**.

```bash
cd frontend
npm install
npm run dev
```

- Giao diện chạy tại: `http://localhost:3000`
- File `frontend/.env.local` trỏ tới backend:
  `NEXT_PUBLIC_API_URL=http://localhost:8000`

## 3. Cấu hình Telegram (thông báo order & liên hệ)

1. Nhắn **@BotFather** trên Telegram → `/newbot` → lấy **bot token**.
2. Lấy **chat id** của bạn (nhắn cho bot, rồi mở
   `https://api.telegram.org/bot<TOKEN>/getUpdates`).
3. Điền vào `backend/.env`:
   ```ini
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```
Khi khách order acc / liên hệ mua / liên hệ qua bài đăng, hệ thống tự gửi
thông tin về Telegram của admin. Nếu để trống, hệ thống vẫn chạy bình thường
(chỉ bỏ qua bước gửi thông báo).

## 4. Cấu hình thanh toán & liên hệ

Đăng nhập admin → **Cấu hình**:
- **Thanh toán (QR):** điền mã ngân hàng (VCB, MB, TCB...), số tài khoản, tên
  chủ tài khoản → hệ thống tự sinh mã QR VietQR khi khách order.
- **Liên hệ Zalo/FB:** điền link Zalo, Facebook, số điện thoại — hiển thị cho
  khách sau khi liên hệ mua / order thành công.
- **Trường form Order:** thêm/sửa/xóa các trường của phiếu order (LV, kiểu
  acc, VIP...).
- **Cấu hình site:** tên shop, logo, hotline, số tiền cọc khi order.

## Chức năng chính

**Người dùng:** xem/tìm/lọc acc theo loại & mức giá · liên hệ mua acc · order
acc theo yêu cầu (sinh QR thanh toán) · đăng bài mua/bán (ẩn danh tính) · quản
lý hồ sơ & bài đăng cá nhân.

**Admin:** quản lý acc (CRUD + ảnh) · danh mục giá · shop · đơn order · bài
đăng (duyệt/từ chối) · người dùng (phân quyền) · xem lịch sử liên hệ (ai mua -
ai bán) · cấu hình toàn hệ thống · thống kê tổng quan.

## 5. Triển khai (Deploy)

| Thành phần | Nền tảng miễn phí gợi ý |
|---|---|
| Frontend (Next.js) | **Vercel** — đặt biến `NEXT_PUBLIC_API_URL` trỏ tới URL backend |
| Backend (FastAPI) | **Render** / **Railway** — *không* deploy được lên Vercel |
| CSDL | **Supabase** (PostgreSQL) |

Khi chuyển CSDL sang Supabase/PostgreSQL: vì dùng SQLAlchemy ORM nên chỉ cần
đổi chuỗi kết nối — tạo lại bảng bằng `init_db.py` (đã thiết kế tương thích cả
SQL Server lẫn PostgreSQL). Cập nhật `CORS_ORIGINS` trong `.env` backend thành
domain frontend thật khi lên production.
