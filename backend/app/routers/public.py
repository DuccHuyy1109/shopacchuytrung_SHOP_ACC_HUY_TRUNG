from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Announcement, ContactSetting, Guide, SiteSetting
from app.schemas.catalog import ContactInfoOut
from app.schemas.settings import AnnouncementOut, GuideOut
from app.services.maintenance import maybe_purge_inactive

router = APIRouter(prefix="/api", tags=["Nội dung công khai"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Endpoint nhẹ để UptimeRobot ping giữ Supabase 'sống' (có truy vấn DB).

    Nhân lượt ping định kỳ này để tự dọn tài khoản offline quá lâu (throttle
    12 giờ/lần, không bao giờ làm hỏng health).
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        return {"status": "db_error"}
    maybe_purge_inactive(db)
    return {"status": "ok"}


@router.get("/guides", response_model=list[GuideOut])
def list_guides(db: Session = Depends(get_db)):
    """Danh sách bài hướng dẫn đã xuất bản."""
    return (
        db.query(Guide)
        .filter(Guide.is_published == True)
        .order_by(Guide.sort_order, Guide.id)
        .all()
    )


@router.get("/guides/{slug}", response_model=GuideOut)
def get_guide(slug: str, db: Session = Depends(get_db)):
    guide = (
        db.query(Guide)
        .filter(Guide.slug == slug, Guide.is_published == True)
        .first()
    )
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài hướng dẫn")
    return guide


@router.get("/announcements", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db)):
    """Thông báo đang bật — hiện popup khi khách vào web."""
    return (
        db.query(Announcement)
        .filter(Announcement.is_active == True)
        .order_by(Announcement.sort_order, Announcement.id)
        .all()
    )


@router.get("/site-settings")
def get_site_settings(db: Session = Depends(get_db)) -> dict[str, str | None]:
    """Cấu hình site công khai (tên shop, logo, hotline...) — dạng key/value."""
    return {s.key: s.value for s in db.query(SiteSetting).all()}


@router.get("/site/contact", response_model=ContactInfoOut)
def get_public_contact(db: Session = Depends(get_db)):
    """Thông tin liên hệ mặc định của shop (cho footer/trang liên hệ)."""
    contact = (
        db.query(ContactSetting)
        .filter(ContactSetting.is_active == True)
        .order_by(ContactSetting.is_default.desc(), ContactSetting.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Chưa cấu hình liên hệ")
    return ContactInfoOut(
        name=contact.name,
        zalo_link=contact.zalo_link,
        facebook_link=contact.facebook_link,
        phone=contact.phone,
    )
