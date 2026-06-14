from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Unicode,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class AccountContact(Base):
    """Ghi nhận khi người dùng nhấn 'Liên hệ mua' trên một acc.

    Hệ thống gửi thông tin về Telegram của admin.
    """

    __tablename__ = "account_contacts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(Unicode(120), nullable=True)
    customer_phone = Column(Unicode(20), nullable=True)
    # Trạng thái xử lý: pending (chưa xử lý) | processing (đang xử lý) | done (đã xử lý)
    status = Column(Unicode(20), nullable=False, default="pending", index=True)
    telegram_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    account = relationship("Account")
    user = relationship("User")
