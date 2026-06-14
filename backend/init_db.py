"""Khởi tạo cơ sở dữ liệu cho Shop Acc Huy Trung.

Chạy:  python init_db.py

Script sẽ:
  1. Tạo database (nếu chưa có) trên SQL Server.
  2. Tạo toàn bộ bảng theo SQLAlchemy models.
  3. Seed dữ liệu mặc định: tài khoản admin, danh mục giá, cấu hình
     liên hệ / thanh toán, các trường form Order, cấu hình site, hướng dẫn.
"""

import sys
from decimal import Decimal

from sqlalchemy import create_engine, text

# Đảm bảo in được tiếng Việt trên console Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

from app.config import settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine

# Import models để Base.metadata biết toàn bộ bảng.
import app.models  # noqa: F401
from app.models import (
    Announcement,
    ContactSetting,
    DescriptionTag,
    Guide,
    OrderFormField,
    PaymentSetting,
    PriceCategory,
    SiteSetting,
    User,
)


def create_database() -> None:
    """Tạo database trên SQL Server nếu chưa tồn tại."""
    master_engine = create_engine(
        settings.master_database_url, isolation_level="AUTOCOMMIT"
    )
    with master_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM sys.databases WHERE name = :name"),
            {"name": settings.DB_NAME},
        ).scalar()
        if exists:
            print(f"[=] Database '{settings.DB_NAME}' đã tồn tại.")
        else:
            conn.execute(text(f"CREATE DATABASE [{settings.DB_NAME}]"))
            print(f"[+] Đã tạo database '{settings.DB_NAME}'.")
    master_engine.dispose()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    print("[+] Đã tạo/đồng bộ toàn bộ bảng.")


def seed_admin(db) -> None:
    if db.query(User).filter(User.username == settings.ADMIN_USERNAME).first():
        print("[=] Tài khoản admin đã tồn tại.")
        return
    db.add(
        User(
            username=settings.ADMIN_USERNAME,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            full_name="Quản trị viên",
            email=settings.ADMIN_EMAIL,
            role="admin",
            is_active=True,
        )
    )
    print(f"[+] Đã tạo admin '{settings.ADMIN_USERNAME}'.")


def seed_price_categories(db) -> None:
    if db.query(PriceCategory).count() > 0:
        print("[=] Danh mục giá đã có dữ liệu.")
        return
    cats = [
        ("Dưới 1 triệu", "duoi-1m", 0, 1_000_000),
        ("1 - 2 triệu", "1m-2m", 1_000_000, 2_000_000),
        ("2 - 5 triệu", "2m-5m", 2_000_000, 5_000_000),
        ("5 - 10 triệu", "5m-10m", 5_000_000, 10_000_000),
        ("10 - 20 triệu", "10m-20m", 10_000_000, 20_000_000),
    ]
    for i, (name, slug, lo, hi) in enumerate(cats):
        db.add(
            PriceCategory(
                name=name,
                slug=slug,
                min_price=Decimal(lo),
                max_price=Decimal(hi),
                sort_order=i,
                is_active=True,
            )
        )
    print(f"[+] Đã tạo {len(cats)} danh mục giá.")


def seed_contact(db) -> None:
    if db.query(ContactSetting).count() > 0:
        print("[=] Cấu hình liên hệ đã có dữ liệu.")
        return
    db.add(
        ContactSetting(
            name="Liên hệ Shop Huy Trung",
            zalo_link="https://zalo.me/0000000000",
            facebook_link="https://facebook.com/shopacchuytrung",
            phone="0000000000",
            is_default=True,
            is_active=True,
        )
    )
    print("[+] Đã tạo cấu hình liên hệ mặc định (hãy cập nhật trong trang admin).")


def seed_payment(db) -> None:
    if db.query(PaymentSetting).count() > 0:
        print("[=] Cấu hình thanh toán đã có dữ liệu.")
        return
    db.add(
        PaymentSetting(
            bank_code="VCB",
            bank_name="Vietcombank",
            account_number="0000000000",
            account_name="NGUYEN VAN A",
            template="compact2",
            is_active=True,
        )
    )
    print("[+] Đã tạo cấu hình thanh toán mẫu (hãy cập nhật trong trang admin).")


def seed_order_form_fields(db) -> None:
    if db.query(OrderFormField).count() > 0:
        print("[=] Form Order đã có trường dữ liệu.")
        return
    fields = [
        dict(
            field_key="level",
            label="Level (LV)",
            field_type="select",
            options=["5x", "6x", "7x", "8x", "9x"],
            is_required=True,
            sort_order=0,
        ),
        dict(
            field_key="acc_type",
            label="Kiểu acc",
            field_type="multiselect",
            # Gợi ý lấy từ "Mô tả tài khoản" (description_tags), không cố định ở đây.
            options=[],
            is_required=True,
            sort_order=1,
        ),
        dict(
            field_key="budget",
            label="Giá mong muốn (VNĐ)",
            field_type="number",
            placeholder="Ví dụ: 2000000",
            is_required=True,
            sort_order=2,
        ),
        dict(
            field_key="vip",
            label="VIP",
            field_type="select",
            options=["1", "2", "3", "4", "5", "6", "7", "8"],
            is_required=False,
            sort_order=3,
        ),
        dict(
            field_key="other_requirements",
            label="Yêu cầu khác",
            field_type="textarea",
            placeholder="Mô tả thêm các yêu cầu của bạn...",
            is_required=False,
            sort_order=4,
        ),
    ]
    for f in fields:
        db.add(OrderFormField(is_active=True, **f))
    print(f"[+] Đã tạo {len(fields)} trường form Order.")


def seed_description_tags(db) -> None:
    if db.query(DescriptionTag).count() > 0:
        print("[=] Mẫu mô tả acc đã có dữ liệu.")
        return
    samples = [
        "17 cây nâng cấp",
        "Full nhân vật",
        "Full skill nhân vật",
        "Nhiều đồ VIP",
        "Acc cổ",
        "Súng vô cực",
        "Thẻ vô cực",
        "Pet đầy đủ",
        "Nhiều skin súng",
        "Trang phục hiếm",
    ]
    for i, text in enumerate(samples):
        db.add(DescriptionTag(text=text, sort_order=i, tag_type=1))
    print(f"[+] Đã tạo {len(samples)} mẫu mô tả acc.")


def seed_site_settings(db) -> None:
    defaults = {
        "site_name": ("Shop Acc Huy Trung", "Tên hiển thị của shop"),
        "site_tagline": (
            "Mua bán acc Free Fire uy tín",
            "Khẩu hiệu hiển thị ở header",
        ),
        "hotline": ("", "Số hotline"),
        "order_deposit_amount": (
            "50000",
            "Phí order acc — trừ vào số dư ví khi thanh toán (VNĐ)",
        ),
        "min_deposit_amount": (
            "10000",
            "Số tiền nạp tối thiểu mỗi lần (VNĐ)",
        ),
        "post_fee_amount": (
            "0",
            "Phí đăng bài (VNĐ) — 0 là miễn phí",
        ),
        "valuation_fee_amount": (
            "0",
            "Phí định giá acc mỗi lượt (VNĐ) — 0 là miễn phí",
        ),
        "buy_account_enabled": (
            "0",
            "Nút Mua acc bằng số dư trên trang chi tiết (1 = bật, 0 = tắt)",
        ),
        "inactive_account_days": (
            "7",
            "Số ngày offline trước khi tài khoản bị tự xóa",
        ),
        "max_upgraded_guns": (
            "30",
            "Số súng nâng cấp tối đa (ô chọn khi thêm acc)",
        ),
        "zalo_group_link": (
            "",
            "Link nhóm Zalo (hiển thị ở Liên hệ & Dịch vụ nổi bật)",
        ),
    }
    added = 0
    for key, (value, desc) in defaults.items():
        if not db.query(SiteSetting).filter(SiteSetting.key == key).first():
            db.add(SiteSetting(key=key, value=value, description=desc))
            added += 1
    print(f"[+] Đã tạo {added} cấu hình site (bỏ qua {len(defaults) - added} cái đã có).")


def seed_announcement(db) -> None:
    if db.query(Announcement).count() > 0:
        print("[=] Thông báo đã có dữ liệu.")
        return
    db.add(
        Announcement(
            title="SHOP ACC UY TÍN",
            content=(
                "SHOP ACC CỦA SHOP\n"
                "UY TÍN - CHẤT LƯỢNG\n"
                "Thu Acc Giá Cao Nhất Thị Trường\n"
                "Nhắn FB Hoặc Zalo Bên Dưới\n"
                "TẤT CẢ ACC MUA TẠI SHOP ĐỀU ĐƯỢC BẢO HÀNH"
            ),
            is_active=True,
            sort_order=0,
        )
    )
    print("[+] Đã tạo thông báo mẫu.")


def seed_guide(db) -> None:
    if db.query(Guide).count() > 0:
        print("[=] Mục hướng dẫn đã có dữ liệu.")
        return
    db.add(
        Guide(
            title="Hướng dẫn mua acc tại Shop Huy Trung",
            slug="huong-dan-mua-acc",
            content=(
                "1. Chọn acc bạn thích trong các danh mục.\n"
                "2. Nhấn 'Liên hệ mua' để được hỗ trợ qua Zalo/Facebook.\n"
                "3. Hoặc dùng chức năng 'Order acc' để đặt acc theo yêu cầu.\n"
                "4. Thanh toán qua mã QR và nhận thông tin tài khoản."
            ),
            sort_order=0,
            is_published=True,
        )
    )
    print("[+] Đã tạo bài hướng dẫn mẫu.")


def main() -> None:
    print("=== KHỞI TẠO CSDL SHOP ACC HUY TRUNG ===")
    if settings.is_postgres:
        print("[=] Dùng Postgres/Supabase — bỏ qua bước tạo database.")
    else:
        create_database()
    create_tables()

    db = SessionLocal()
    try:
        seed_admin(db)
        seed_price_categories(db)
        seed_contact(db)
        seed_payment(db)
        seed_order_form_fields(db)
        seed_description_tags(db)
        seed_site_settings(db)
        seed_announcement(db)
        seed_guide(db)
        db.commit()
        print("=== HOÀN TẤT ===")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
