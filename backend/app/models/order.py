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


class OrderFormField(Base):
    """Trường thông tin của phiếu Order Acc — admin tự thêm/sửa/xóa.

    Ví dụ: LV (select 5x/6x/7x/8x/9x), Kiểu acc (select), Giá, VIP,
    ô text yêu cầu khác...
    """

    __tablename__ = "order_form_fields"

    id = Column(Integer, primary_key=True, index=True)
    field_key = Column(Unicode(50), unique=True, nullable=False)
    label = Column(Unicode(150), nullable=False)
    # text | textarea | number | select
    field_type = Column(Unicode(20), nullable=False, default="text")
    # Danh sách lựa chọn cho field_type = select
    options = Column(JSONEncodedDict, nullable=True)
    placeholder = Column(Unicode(200), nullable=True)
    is_required = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Order(Base):
    """Phiếu Order Acc do người dùng gửi."""

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(Unicode(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    customer_name = Column(Unicode(120), nullable=False)
    customer_phone = Column(Unicode(20), nullable=False)
    customer_email = Column(Unicode(255), nullable=True)

    # Dữ liệu các trường động: {field_key: value}
    form_data = Column(JSONEncodedDict, nullable=True)
    desired_price = Column(Numeric(15, 2), nullable=True)
    vip = Column(Integer, nullable=True)
    note = Column(UnicodeText, nullable=True)

    # Số tiền cần chuyển khoản (cọc / thanh toán)
    amount = Column(Numeric(15, 2), nullable=True)

    # pending | paid | processing | completed | cancelled
    status = Column(Unicode(20), nullable=False, default="pending", index=True)
    # unpaid | pending_confirm (khách báo đã CK, chờ admin xác nhận) | confirmed
    payment_status = Column(Unicode(20), nullable=False, default="unpaid")
    telegram_sent = Column(Boolean, nullable=False, default=False)
    admin_note = Column(UnicodeText, nullable=True)
    # Danh sách URL ảnh bill chuyển khoản do khách đính kèm.
    bill_images = Column(JSONEncodedDict, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="orders")
