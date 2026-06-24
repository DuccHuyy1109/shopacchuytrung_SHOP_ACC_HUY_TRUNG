from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import ContactInfoOut
from app.schemas.order import BankInfo


# ---------- Nạp tiền (người dùng) ----------
class DepositPrepare(BaseModel):
    """Bước 1: chỉ xin QR + nội dung CK, KHÔNG tạo bản ghi (chống spam)."""

    amount: float = Field(gt=0)


class DepositSubmit(BaseModel):
    """Bước 2: khách đã CK & có bill -> mới tạo yêu cầu nạp gửi admin."""

    amount: float = Field(gt=0)
    deposit_code: str
    transfer_content: str
    bill_images: list[str] = []


class DepositOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    deposit_code: str
    amount: float
    transfer_content: str
    status: str
    bill_images: list[str] | None = None
    admin_note: str | None = None
    created_at: datetime | None = None
    confirmed_at: datetime | None = None


class DepositPrepareResponse(BaseModel):
    """QR + thông tin chuyển khoản ở bước 1 — chưa lưu DB."""

    deposit_code: str
    amount: float
    transfer_content: str
    qr_url: str
    bank: BankInfo


class DepositConfirmResponse(BaseModel):
    deposit: DepositOut
    message: str


# ---------- Ví / giao dịch ----------
class WalletTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    amount: float
    balance_after: float
    ref_type: str | None = None
    ref_id: int | None = None
    note: str | None = None
    created_at: datetime | None = None


class WalletMeOut(BaseModel):
    balance: float
    transactions: list[WalletTransactionOut]


class FeePayResponse(BaseModel):
    """Kết quả thu phí dịch vụ (định giá...). paid=False khi phí = 0."""

    fee: float
    balance: float
    paid: bool


class PurchasedAccountOut(BaseModel):
    """Một acc người dùng đã mua bằng số dư ví."""

    account_id: int
    account_code: str
    amount: float
    purchased_at: datetime | None = None
    thumbnail: str | None = None
    status: str
    # Liên hệ nhận acc — theo liên hệ đã gắn với acc (hoặc liên hệ mặc định).
    contact: ContactInfoOut | None = None


class PurchaseAdminOut(PurchasedAccountOut):
    """Lịch sử mua acc cho admin — kèm thông tin người mua."""

    user_id: int | None = None
    username: str | None = None
    full_name: str | None = None
    phone: str | None = None


# ---------- Admin ----------
class DepositRefOut(BaseModel):
    """Thông tin yêu cầu nạp gắn với 1 giao dịch ví — để xem chi tiết + bill."""

    id: int
    deposit_code: str
    status: str
    transfer_content: str
    bill_images: list[str] | None = None
    admin_note: str | None = None


class WalletTransactionAdminOut(WalletTransactionOut):
    user_id: int
    username: str | None = None
    full_name: str | None = None
    # Chỉ có với giao dịch nạp tiền (type=deposit) — để hiện chi tiết + ảnh bill.
    deposit: DepositRefOut | None = None


class DepositAdminOut(DepositOut):
    user_id: int
    username: str | None = None
    full_name: str | None = None
    phone: str | None = None
    telegram_sent: bool = False
    updated_at: datetime | None = None


class BalanceAdjust(BaseModel):
    # Dương = cộng tiền, âm = trừ tiền.
    amount: float
    note: str | None = None


class DepositReject(BaseModel):
    note: str | None = None
