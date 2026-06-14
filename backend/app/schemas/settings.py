from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------- Contact (Zalo / Facebook) ----------
class ContactSettingBase(BaseModel):
    name: str = Field(max_length=120)
    zalo_link: str | None = Field(default=None, max_length=300)
    facebook_link: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=20)
    is_default: bool = False
    is_active: bool = True


class ContactSettingCreate(ContactSettingBase):
    pass


class ContactSettingUpdate(BaseModel):
    name: str | None = None
    zalo_link: str | None = None
    facebook_link: str | None = None
    phone: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class ContactSettingOut(ContactSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Payment (VietQR) ----------
class PaymentSettingBase(BaseModel):
    bank_code: str = Field(max_length=20)
    bank_name: str | None = Field(default=None, max_length=120)
    account_number: str = Field(max_length=40)
    account_name: str = Field(max_length=120)
    template: str = "compact2"
    is_active: bool = True


class PaymentSettingCreate(PaymentSettingBase):
    pass


class PaymentSettingUpdate(BaseModel):
    bank_code: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    account_name: str | None = None
    template: str | None = None
    is_active: bool | None = None


class PaymentSettingOut(PaymentSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Site settings (key-value) ----------
class SiteSettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str | None = None
    description: str | None = None


class SiteSettingUpdate(BaseModel):
    value: str | None = None


# ---------- Guides ----------
class GuideBase(BaseModel):
    title: str = Field(max_length=200)
    content: str | None = None
    sort_order: int = 0
    is_published: bool = True


class GuideCreate(GuideBase):
    pass


class GuideUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    sort_order: int | None = None
    is_published: bool | None = None


class GuideOut(GuideBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    created_at: datetime | None = None


# ---------- Announcement (popup thông báo) ----------
class AnnouncementBase(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    sort_order: int = 0


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class AnnouncementOut(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
