from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.settings import ContactSettingOut


# ---------- Price category ----------
class PriceCategoryBase(BaseModel):
    name: str = Field(max_length=100)
    min_price: float | None = None
    max_price: float | None = None
    sort_order: int = 0
    is_active: bool = True


class PriceCategoryCreate(PriceCategoryBase):
    pass


class PriceCategoryUpdate(BaseModel):
    name: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PriceCategoryOut(PriceCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str


# ---------- Shop ----------
class ShopBase(BaseModel):
    name: str = Field(max_length=120)
    description: str | None = None
    is_active: bool = True


class ShopCreate(ShopBase):
    pass


class ShopUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ShopOut(ShopBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Account images ----------
class AccountImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    sort_order: int


# ---------- Account ----------
# Mã acc và danh mục giá do hệ thống tự sinh / tự xếp — admin không nhập tay.
class AccountCreate(BaseModel):
    # Mã acc đặt sẵn từ client (để gom ảnh theo thư mục); bỏ trống -> tự sinh.
    account_code: str | None = Field(default=None, max_length=50)
    category_type: str = Field(default="acc_co", pattern="^(acc_co|sieu_pham|acc_thuong)$")
    shop_id: int | None = None
    contact_id: int | None = None
    original_price: float = 0
    sale_price: float = 0
    upgraded_guns_count: int = Field(default=0, ge=0)
    vip_level: int = Field(default=1, ge=1, le=8)
    description: str | None = None
    status: str = Field(default="available", pattern="^(available|sold|hidden)$")
    is_featured: bool = False
    image_urls: list[str] = []


class AccountUpdate(BaseModel):
    category_type: str | None = Field(default=None, pattern="^(acc_co|sieu_pham|acc_thuong)$")
    shop_id: int | None = None
    contact_id: int | None = None
    original_price: float | None = None
    sale_price: float | None = None
    upgraded_guns_count: int | None = Field(default=None, ge=0)
    vip_level: int | None = Field(default=None, ge=1, le=8)
    description: str | None = None
    status: str | None = Field(default=None, pattern="^(available|sold|hidden)$")
    is_featured: bool | None = None
    image_urls: list[str] | None = None


class AccountListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_code: str
    category_type: str
    price_category_id: int | None = None
    original_price: float
    sale_price: float
    upgraded_guns_count: int
    vip_level: int
    status: str
    is_featured: bool
    thumbnail: str | None = None
    created_at: datetime | None = None


# Bản công khai — KHÔNG lộ shop (chỉ admin thấy acc thuộc shop nào).
class AccountPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_code: str
    category_type: str
    price_category_id: int | None = None
    contact_id: int | None = None
    original_price: float
    sale_price: float
    upgraded_guns_count: int
    vip_level: int
    description: str | None = None
    status: str
    is_featured: bool
    view_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    images: list[AccountImageOut] = []
    price_category: PriceCategoryOut | None = None
    contact: ContactSettingOut | None = None


# Bản dành cho admin — có đầy đủ thông tin shop.
class AccountOut(AccountPublicOut):
    shop_id: int | None = None
    shop: ShopOut | None = None


class ContactInfoOut(BaseModel):
    name: str
    zalo_link: str | None = None
    facebook_link: str | None = None
    phone: str | None = None


class AccountBuyResponse(BaseModel):
    """Kết quả mua acc trực tiếp bằng số dư ví."""

    account_code: str
    balance: float
    contact: ContactInfoOut
    message: str


# ---------- Description tag (mẫu mô tả acc) ----------
class DescriptionTagBase(BaseModel):
    text: str = Field(max_length=150)
    gia_tien: float = 0
    sort_order: int = 0
    tag_type: int = 1  # 1: Đặc điểm chung, 2: Súng nâng cấp


class DescriptionTagCreate(DescriptionTagBase):
    pass


class DescriptionTagUpdate(BaseModel):
    text: str | None = Field(default=None, max_length=150)
    gia_tien: float | None = None
    sort_order: int | None = None
    tag_type: int | None = None


class DescriptionTagOut(DescriptionTagBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
