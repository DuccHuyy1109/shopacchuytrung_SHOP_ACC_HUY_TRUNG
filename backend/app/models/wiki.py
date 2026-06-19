from sqlalchemy import Column, DateTime, Integer, Unicode, func

from app.database import Base


class WikiItem(Base):
    """Trang phục / vật phẩm Free Fire đồng bộ từ wiki.ff.garena.vn.

    Khóa chính dùng LUÔN id của Garena (không tự tăng) để đồng bộ idempotent
    (chạy lại chỉ cập nhật, không tạo trùng). Ảnh icon hotlink thẳng CDN Garena
    — KHÔNG host lại (xem cột icon).
    """

    __tablename__ = "wiki_items"

    id = Column(Integer, primary_key=True, autoincrement=False, index=True)
    name_vi = Column(Unicode(300), nullable=False, default="")
    icon = Column(Unicode(500), nullable=True)
    # Mã danh mục/thể loại/độ hiếm theo hệ thống Garena (3=Trang Phục, 10=Súng, 4=Sưu tập).
    category = Column(Integer, nullable=False, default=0, index=True)
    genre = Column(Integer, nullable=False, default=0, index=True)
    rare = Column(Integer, nullable=False, default=0, index=True)
    gender = Column(Integer, nullable=False, default=0)
    # Cấp tiến hóa của súng (stats.evoLevel, 1-8) — None nếu không có cấp.
    level = Column(Integer, nullable=True)
    # Tag id nối chuỗi có dấu phẩy bao quanh, vd ",4,5," (lọc collab/legendary).
    tags = Column(Unicode(100), nullable=True)
    # Id các món thành phần trong bộ, nối chuỗi ",211053027,205053016," (xem theo bộ).
    sub_items = Column(Unicode(500), nullable=True)
    synced_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
