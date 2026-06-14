from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import ContactInfoOut


# ---------- Order form fields (admin tự cấu hình) ----------
class OrderFormFieldBase(BaseModel):
    label: str = Field(max_length=150)
    field_type: str = Field(
        default="text", pattern="^(text|textarea|number|select|multiselect)$"
    )
    options: list[str] | None = None
    placeholder: str | None = Field(default=None, max_length=200)
    is_required: bool = False
    sort_order: int = 0
    is_active: bool = True


class OrderFormFieldCreate(OrderFormFieldBase):
    field_key: str = Field(max_length=50, pattern="^[a-zA-Z0-9_]+$")


class OrderFormFieldUpdate(BaseModel):
    label: str | None = None
    field_type: str | None = Field(
        default=None, pattern="^(text|textarea|number|select|multiselect)$"
    )
    options: list[str] | None = None
    placeholder: str | None = None
    is_required: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class OrderFormFieldOut(OrderFormFieldBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    field_key: str


# ---------- Order ----------
class OrderCreate(BaseModel):
    # Thông tin liên hệ lấy tự động từ hồ sơ người dùng (không nhận từ client).
    # {field_key: value} theo các trường form đang hoạt động.
    form_data: dict[str, Any] = {}


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_code: str
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    form_data: dict[str, Any] | None = None
    desired_price: float | None = None
    vip: int | None = None
    note: str | None = None
    amount: float | None = None
    status: str
    payment_status: str
    bill_images: list[str] | None = None
    created_at: datetime | None = None


class BankInfo(BaseModel):
    bank_code: str
    bank_name: str | None = None
    account_number: str
    account_name: str


class OrderCreateResponse(BaseModel):
    # Order Acc thanh toán bằng số dư ví — trả về giá đơn & số dư hiện tại.
    order: OrderOut
    amount: float
    balance: float


class OrderPayResponse(BaseModel):
    order: OrderOut
    balance: float
    contact: ContactInfoOut
    message: str


# ---------- Admin ----------
class OrderAdminOut(OrderOut):
    user_id: int | None = None
    admin_note: str | None = None
    telegram_sent: bool = False
    updated_at: datetime | None = None


class OrderUpdate(BaseModel):
    status: str | None = Field(
        default=None,
        pattern="^(pending|paid|processing|completed|cancelled)$",
    )
    payment_status: str | None = Field(
        default=None, pattern="^(unpaid|pending_confirm|confirmed)$"
    )
    admin_note: str | None = None
