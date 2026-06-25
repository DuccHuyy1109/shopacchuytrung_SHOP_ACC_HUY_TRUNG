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


class Post(Base):
    """Bài đăng cần mua / cần bán của người dùng.

    Danh tính người đăng (user_id) được ẩn hoàn toàn với người dùng khác,
    chỉ admin mới biết.
    """

    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # buy = cần mua/tìm acc | sell = cần bán
    post_type = Column(Unicode(10), nullable=False, default="sell", index=True)
    title = Column(Unicode(200), nullable=True)
    caption = Column(UnicodeText, nullable=True)
    price = Column(Numeric(15, 2), nullable=True)
    # pending | approved | rejected | closed (closed = đã bán/đã xong)
    status = Column(Unicode(20), nullable=False, default="pending", index=True)
    # Admin ghim bài lên đầu feed.
    is_pinned = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="posts", foreign_keys=[user_id])

    @property
    def by_admin(self) -> bool:
        """Bài do admin (Shop Acc Huy Trung) đăng — vẫn không lộ user_id."""
        return bool(self.author and self.author.is_admin)

    images = relationship(
        "PostImage",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="PostImage.sort_order",
    )
    contacts = relationship(
        "PostContact", back_populates="post", cascade="all, delete-orphan"
    )


class PostImage(Base):
    __tablename__ = "post_images"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url = Column(Unicode(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    post = relationship("Post", back_populates="images")


class PostContact(Base):
    """Ghi nhận khi một người dùng nhấn 'Liên hệ' trên bài đăng.

    Hệ thống gửi phiếu (ai mua - ai bán + thông tin bài) về admin.
    """

    __tablename__ = "post_contacts"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    # Người nhấn nút liên hệ
    interested_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Người đăng bài (lưu lại để admin tra cứu nhanh)
    poster_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Vai trò của người nhấn liên hệ: buyer | seller
    interested_role = Column(Unicode(10), nullable=False)
    telegram_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="contacts")
    interested_user = relationship("User", foreign_keys=[interested_user_id])
    poster_user = relationship("User", foreign_keys=[poster_user_id])
