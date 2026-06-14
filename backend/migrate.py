"""Cập nhật cấu trúc CSDL cho các thay đổi mới (idempotent — chạy lại an toàn).

Chạy:  python migrate.py

  - Bỏ cột accounts.title (không còn dùng).
  - Thêm cột account_contacts.status (trạng thái xử lý liên hệ mua acc).
  - Tạo bảng description_tags (mẫu mô tả acc).
  - Thêm cột description_tags.gia_tien (giá trị định giá cho từng mô tả).
  - Chuyển acc loại 'theo_gia' (đã bỏ) sang 'acc_co'.
  - Thêm cấu hình site max_upgraded_guns (số súng nâng cấp tối đa).
  - Thêm cột users.balance (số dư ví) + cấu hình min_deposit_amount.
  - Tạo bảng deposit_requests, wallet_transactions (ví / nạp tiền).
"""

import sys

from sqlalchemy import text

# Import models để Base.metadata biết toàn bộ bảng (gồm bảng mới).
import app.models  # noqa: F401
from app.database import Base, engine

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

MSSQL_STATEMENTS = [
    (
        "Bỏ cột accounts.title",
        "IF COL_LENGTH('accounts','title') IS NOT NULL "
        "ALTER TABLE accounts DROP COLUMN title;",
    ),
    (
        "Thêm cột account_contacts.status",
        "IF COL_LENGTH('account_contacts','status') IS NULL "
        "ALTER TABLE account_contacts ADD status NVARCHAR(20) NOT NULL "
        "CONSTRAINT DF_account_contacts_status DEFAULT 'pending';",
    ),
    (
        "Chuyển acc 'theo_gia' -> 'acc_co'",
        "UPDATE accounts SET category_type = 'acc_co' "
        "WHERE category_type = 'theo_gia';",
    ),
    (
        "Thêm cấu hình max_upgraded_guns",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'max_upgraded_guns') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('max_upgraded_guns', '30', "
        "N'Số súng nâng cấp tối đa (ô chọn khi thêm acc)');",
    ),
    (
        "Đổi trường 'Kiểu acc' sang chọn nhiều (multiselect)",
        "UPDATE order_form_fields SET field_type = 'multiselect' "
        "WHERE field_key = 'acc_type';",
    ),
    (
        "Thêm cột description_tags.gia_tien",
        "IF COL_LENGTH('description_tags','gia_tien') IS NULL "
        "ALTER TABLE description_tags ADD gia_tien DECIMAL(15,2) NOT NULL "
        "CONSTRAINT DF_description_tags_gia_tien DEFAULT 0;",
    ),
    (
        "Thêm cột description_tags.tag_type",
        "IF COL_LENGTH('description_tags','tag_type') IS NULL "
        "ALTER TABLE description_tags ADD tag_type INT NOT NULL "
        "CONSTRAINT DF_description_tags_tag_type DEFAULT 1;",
    ),
    (
        "Thêm cột orders.bill_images",
        "IF COL_LENGTH('orders','bill_images') IS NULL "
        "ALTER TABLE orders ADD bill_images NVARCHAR(MAX) NULL;",
    ),
    (
        "Thêm cột posts.is_pinned",
        "IF COL_LENGTH('posts','is_pinned') IS NULL "
        "ALTER TABLE posts ADD is_pinned BIT NOT NULL "
        "CONSTRAINT DF_posts_is_pinned DEFAULT 0;",
    ),
    (
        "Thêm cột users.balance (số dư ví)",
        "IF COL_LENGTH('users','balance') IS NULL "
        "ALTER TABLE users ADD balance DECIMAL(15,2) NOT NULL "
        "CONSTRAINT DF_users_balance DEFAULT 0;",
    ),
    (
        "Thêm cấu hình min_deposit_amount",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'min_deposit_amount') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('min_deposit_amount', '10000', "
        "N'Số tiền nạp tối thiểu mỗi lần (VNĐ)');",
    ),
    (
        "Thêm cấu hình post_fee_amount",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'post_fee_amount') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('post_fee_amount', '0', N'Phí đăng bài (VNĐ) — 0 là miễn phí');",
    ),
    (
        "Thêm cấu hình valuation_fee_amount",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'valuation_fee_amount') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('valuation_fee_amount', '0', "
        "N'Phí định giá acc mỗi lượt (VNĐ) — 0 là miễn phí');",
    ),
    (
        "Thêm cấu hình buy_account_enabled",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'buy_account_enabled') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('buy_account_enabled', '0', "
        "N'Nút Mua acc bằng số dư trên trang chi tiết (1 = bật, 0 = tắt)');",
    ),
    (
        "Thêm cột users.token_version",
        "IF COL_LENGTH('users','token_version') IS NULL "
        "ALTER TABLE users ADD token_version INT NOT NULL "
        "CONSTRAINT DF_users_token_version DEFAULT 0;",
    ),
    (
        "Thêm cột users.last_active_at",
        "IF COL_LENGTH('users','last_active_at') IS NULL "
        "ALTER TABLE users ADD last_active_at DATETIME2 NULL;",
    ),
    (
        "Khởi tạo last_active_at = hiện tại cho user cũ",
        "UPDATE users SET last_active_at = SYSUTCDATETIME() "
        "WHERE last_active_at IS NULL;",
    ),
    (
        "Thêm cấu hình inactive_account_days",
        "IF NOT EXISTS (SELECT 1 FROM site_settings WHERE [key] = 'inactive_account_days') "
        "INSERT INTO site_settings ([key], [value], [description]) "
        "VALUES ('inactive_account_days', '7', "
        "N'Số ngày offline trước khi tài khoản bị tự xóa');",
    ),
]

POSTGRES_STATEMENTS = [
    ("Bỏ cột accounts.title", "ALTER TABLE accounts DROP COLUMN IF EXISTS title;"),
    (
        "Thêm cột account_contacts.status",
        "ALTER TABLE account_contacts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';",
    ),
    (
        "Chuyển acc 'theo_gia' -> 'acc_co'",
        "UPDATE accounts SET category_type = 'acc_co' WHERE category_type = 'theo_gia';",
    ),
    (
        "Thêm cấu hình max_upgraded_guns",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'max_upgraded_guns', '30', 'Số súng nâng cấp tối đa (ô chọn khi thêm acc)' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'max_upgraded_guns');",
    ),
    (
        "Đổi trường 'Kiểu acc' sang chọn nhiều (multiselect)",
        "UPDATE order_form_fields SET field_type = 'multiselect' WHERE field_key = 'acc_type';",
    ),
    (
        "Thêm cột orders.bill_images",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS bill_images TEXT NULL;",
    ),
    (
        "Thêm cột posts.is_pinned",
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;",
    ),
    (
        "Thêm cột description_tags.gia_tien",
        "ALTER TABLE description_tags ADD COLUMN IF NOT EXISTS gia_tien NUMERIC(15,2) NOT NULL DEFAULT 0;",
    ),
    (
        "Thêm cột description_tags.tag_type",
        "ALTER TABLE description_tags ADD COLUMN IF NOT EXISTS tag_type INTEGER NOT NULL DEFAULT 1;",
    ),
    (
        "Thêm cột users.balance (số dư ví)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(15,2) NOT NULL DEFAULT 0;",
    ),
    (
        "Thêm cấu hình min_deposit_amount",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'min_deposit_amount', '10000', 'Số tiền nạp tối thiểu mỗi lần (VNĐ)' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'min_deposit_amount');",
    ),
    (
        "Thêm cấu hình post_fee_amount",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'post_fee_amount', '0', 'Phí đăng bài (VNĐ) — 0 là miễn phí' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'post_fee_amount');",
    ),
    (
        "Thêm cấu hình valuation_fee_amount",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'valuation_fee_amount', '0', 'Phí định giá acc mỗi lượt (VNĐ) — 0 là miễn phí' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'valuation_fee_amount');",
    ),
    (
        "Thêm cấu hình buy_account_enabled",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'buy_account_enabled', '0', 'Nút Mua acc bằng số dư trên trang chi tiết (1 = bật, 0 = tắt)' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'buy_account_enabled');",
    ),
    (
        "Thêm cột users.token_version",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;",
    ),
    (
        "Thêm cột users.last_active_at",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NULL;",
    ),
    (
        "Khởi tạo last_active_at = hiện tại cho user cũ",
        "UPDATE users SET last_active_at = NOW() WHERE last_active_at IS NULL;",
    ),
    (
        "Thêm cấu hình inactive_account_days",
        "INSERT INTO site_settings (key, value, description) "
        "SELECT 'inactive_account_days', '7', 'Số ngày offline trước khi tài khoản bị tự xóa' "
        "WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'inactive_account_days');",
    ),
]


def main() -> None:
    print("=== CẬP NHẬT CẤU TRÚC CSDL ===")
    # Tạo các bảng còn thiếu (vd: description_tags) mà không đụng bảng đã có.
    Base.metadata.create_all(bind=engine)
    print("[+] Đồng bộ bảng (tạo description_tags nếu chưa có).")
    dialect = engine.dialect.name
    statements = POSTGRES_STATEMENTS if dialect == "postgresql" else MSSQL_STATEMENTS
    with engine.begin() as conn:
        for desc, sql in statements:
            conn.execute(text(sql))
            print(f"[+] {desc}")
    print("=== HOÀN TẤT ===")


if __name__ == "__main__":
    main()
