from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Unicode,
    UnicodeText,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class PriceCategory(Base):
    """Danh mục acc theo giá: dưới 1tr, 1-2tr, 2-5tr, 5-10tr, 10-20tr..."""

    __tablename__ = "price_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Unicode(100), nullable=False)
    slug = Column(Unicode(120), unique=True, nullable=False, index=True)
    min_price = Column(Numeric(15, 2), nullable=True)
    max_price = Column(Numeric(15, 2), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())

    accounts = relationship("Account", back_populates="price_category")


class Shop(Base):
    """Acc thuộc shop nào."""

    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Unicode(120), nullable=False)
    description = Column(UnicodeText, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())

    accounts = relationship("Account", back_populates="shop")


class Account(Base):
    """Tài khoản game Free Fire đang rao bán."""

    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    # Mã số (ID) acc do shop đặt
    account_code = Column(Unicode(50), unique=True, nullable=False, index=True)
    # acc_co | sieu_pham | acc_thuong  (acc tự xếp theo giá nên bỏ loại "theo_gia")
    category_type = Column(Unicode(30), nullable=False, default="acc_co", index=True)
    price_category_id = Column(
        Integer, ForeignKey("price_categories.id"), nullable=True, index=True
    )
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    # Liên hệ mua (zalo/fb do admin thiết lập)
    contact_id = Column(Integer, ForeignKey("contact_settings.id"), nullable=True)

    original_price = Column(Numeric(15, 2), nullable=False, default=0)  # giá gốc
    sale_price = Column(Numeric(15, 2), nullable=False, default=0)  # giá sau giảm
    upgraded_guns_count = Column(Integer, nullable=False, default=0)  # số súng nâng cấp
    vip_level = Column(Integer, nullable=False, default=0)  # vip 1-8
    description = Column(UnicodeText, nullable=True)

    # available | sold | hidden
    status = Column(Unicode(20), nullable=False, default="available", index=True)
    is_featured = Column(Boolean, nullable=False, default=False)
    view_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    price_category = relationship("PriceCategory", back_populates="accounts")
    shop = relationship("Shop", back_populates="accounts")
    contact = relationship("ContactSetting")
    images = relationship(
        "AccountImage",
        back_populates="account",
        cascade="all, delete-orphan",
        order_by="AccountImage.sort_order",
    )


class AccountImage(Base):
    """Ảnh của một tài khoản (mỗi acc có thể nhiều ảnh)."""

    __tablename__ = "account_images"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url = Column(Unicode(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    account = relationship("Account", back_populates="images")


class DescriptionTag(Base):
    """Mẫu mô tả tài khoản do admin định nghĩa.

    Dùng để gợi ý (autocomplete) khi admin nhập mô tả cho acc.
    Ví dụ: "17 cây nâng cấp", "Full nhân vật", "Nhiều đồ VIP"...
    """

    __tablename__ = "description_tags"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Unicode(150), unique=True, nullable=False)
    gia_tien = Column(Numeric(15, 2), nullable=False, default=0)
    tag_type = Column(Integer, nullable=False, default=1)  # 1: Đặc điểm chung, 2: Súng nâng cấp
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
