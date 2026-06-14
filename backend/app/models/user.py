from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, Unicode, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(Unicode(50), unique=True, nullable=False, index=True)
    password_hash = Column(Unicode(255), nullable=False)
    full_name = Column(Unicode(120), nullable=True)
    # Số điện thoại đang dùng Zalo
    phone = Column(Unicode(20), nullable=True)
    email = Column(Unicode(255), nullable=True, index=True)
    # user | admin
    role = Column(Unicode(20), nullable=False, default="user")
    is_active = Column(Boolean, nullable=False, default=True)
    # Số dư ví (VNĐ) — chỉ thay đổi ở server qua app.services.wallet.
    balance = Column(Numeric(15, 2), nullable=False, default=0)
    # Tăng mỗi khi đổi mật khẩu -> mọi token cũ (ver khác) bị vô hiệu.
    token_version = Column(Integer, nullable=False, default=0)
    # Lần cuối còn hoạt động (có request kèm token) — dùng để tự dọn tài khoản
    # offline quá lâu.
    last_active_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    posts = relationship(
        "Post", back_populates="author", foreign_keys="Post.user_id"
    )
    orders = relationship("Order", back_populates="user")
    deposits = relationship("DepositRequest", back_populates="user")
    wallet_transactions = relationship("WalletTransaction", back_populates="user")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
