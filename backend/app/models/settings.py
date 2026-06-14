from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    Unicode,
    UnicodeText,
    func,
)

from app.database import Base


class ContactSetting(Base):
    """Thông tin liên hệ (Zalo / Facebook) do admin thiết lập.

    Dùng cho nút 'Liên hệ mua' của acc và bước liên hệ sau khi order.
    """

    __tablename__ = "contact_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Unicode(120), nullable=False)
    zalo_link = Column(Unicode(300), nullable=True)
    facebook_link = Column(Unicode(300), nullable=True)
    phone = Column(Unicode(20), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class PaymentSetting(Base):
    """Cấu hình tài khoản nhận tiền để sinh mã QR (VietQR)."""

    __tablename__ = "payment_settings"

    id = Column(Integer, primary_key=True, index=True)
    # Mã ngân hàng theo chuẩn VietQR, ví dụ: VCB, MB, TCB, ACB...
    bank_code = Column(Unicode(20), nullable=False)
    bank_name = Column(Unicode(120), nullable=True)
    account_number = Column(Unicode(40), nullable=False)
    account_name = Column(Unicode(120), nullable=False)
    # Mẫu QR của VietQR: compact | compact2 | qr_only | print
    template = Column(Unicode(20), nullable=False, default="compact2")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class SiteSetting(Base):
    """Cấu hình chung dạng key-value: logo, tên shop, hotline, banner..."""

    __tablename__ = "site_settings"

    key = Column(Unicode(80), primary_key=True)
    value = Column(UnicodeText, nullable=True)
    description = Column(Unicode(255), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Announcement(Base):
    """Thông báo hiện popup khi khách vào web (admin tự thêm/sửa/ẩn-hiện)."""

    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Unicode(200), nullable=True)
    content = Column(UnicodeText, nullable=True)
    image_url = Column(Unicode(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Guide(Base):
    """Bài hướng dẫn (mục Hướng dẫn trên header)."""

    __tablename__ = "guides"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Unicode(200), nullable=False)
    slug = Column(Unicode(220), unique=True, nullable=False, index=True)
    content = Column(UnicodeText, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
