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
from app.models.types import JSONEncodedDict


class DepositRequest(Base):
    """Yêu cầu nạp tiền vào ví do người dùng gửi (chờ admin xác nhận cộng tiền)."""

    __tablename__ = "deposit_requests"

    id = Column(Integer, primary_key=True, index=True)
    # Mã yêu cầu nội bộ (để tra cứu/đối soát).
    deposit_code = Column(Unicode(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Số tiền người dùng khai báo sẽ chuyển khoản.
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    # Nội dung chuyển khoản: NAPTIEN<TÊN><MÃ> (không dấu, viết hoa).
    transfer_content = Column(Unicode(120), nullable=False)
    # Danh sách URL ảnh bill chuyển khoản do người dùng đính kèm.
    bill_images = Column(JSONEncodedDict, nullable=True)

    # pending (chờ duyệt) | confirmed (đã cộng tiền) | rejected (từ chối)
    status = Column(Unicode(20), nullable=False, default="pending", index=True)
    admin_note = Column(UnicodeText, nullable=True)
    telegram_sent = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    confirmed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="deposits")


class WalletTransaction(Base):
    """Sổ ghi biến động số dư ví (audit). Mỗi dòng là 1 lần cộng/trừ.

    amount > 0: cộng tiền (nạp, hoàn, điều chỉnh tăng).
    amount < 0: trừ tiền (thanh toán order, điều chỉnh giảm).
    balance_after: ảnh chụp số dư SAU giao dịch để đối soát.
    """

    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # deposit | order_payment | adjust | refund
    type = Column(Unicode(20), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    balance_after = Column(Numeric(15, 2), nullable=False)

    # Liên kết tới đối tượng nguồn (deposit / order) để truy vết.
    ref_type = Column(Unicode(20), nullable=True)
    ref_id = Column(Integer, nullable=True)
    note = Column(UnicodeText, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="wallet_transactions")
