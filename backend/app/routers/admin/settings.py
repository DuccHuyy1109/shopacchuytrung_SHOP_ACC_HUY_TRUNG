import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models import (
    Announcement,
    ContactSetting,
    Guide,
    PaymentSetting,
    SiteSetting,
)
from app.schemas.common import Message
from app.services.storage import delete_folder_by_url, delete_image
from app.schemas.settings import (
    AnnouncementCreate,
    AnnouncementOut,
    AnnouncementUpdate,
    ContactSettingCreate,
    ContactSettingOut,
    ContactSettingUpdate,
    GuideCreate,
    GuideOut,
    GuideUpdate,
    PaymentSettingCreate,
    PaymentSettingOut,
    PaymentSettingUpdate,
    SiteSettingOut,
    SiteSettingUpdate,
)
from app.utils.codes import slugify

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Cấu hình"],
    dependencies=[Depends(require_admin)],
)


# ==================== CONTACT SETTINGS ====================
def _clear_other_defaults(db: Session, keep_id: int | None) -> None:
    q = db.query(ContactSetting).filter(ContactSetting.is_default == True)
    if keep_id is not None:
        q = q.filter(ContactSetting.id != keep_id)
    q.update({ContactSetting.is_default: False})


@router.get("/contacts", response_model=list[ContactSettingOut])
def list_contacts(db: Session = Depends(get_db)):
    return db.query(ContactSetting).order_by(ContactSetting.id).all()


@router.post("/contacts", response_model=ContactSettingOut, status_code=201)
def create_contact(payload: ContactSettingCreate, db: Session = Depends(get_db)):
    contact = ContactSetting(**payload.model_dump())
    db.add(contact)
    db.flush()
    if contact.is_default:
        _clear_other_defaults(db, keep_id=contact.id)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/contacts/{contact_id}", response_model=ContactSettingOut)
def update_contact(
    contact_id: int,
    payload: ContactSettingUpdate,
    db: Session = Depends(get_db),
):
    contact = db.get(ContactSetting, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    if contact.is_default:
        _clear_other_defaults(db, keep_id=contact.id)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", response_model=Message)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(ContactSetting, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ")
    db.delete(contact)
    db.commit()
    return Message(detail="Đã xóa liên hệ")


# ==================== PAYMENT SETTINGS ====================
@router.get("/payments", response_model=list[PaymentSettingOut])
def list_payments(db: Session = Depends(get_db)):
    return db.query(PaymentSetting).order_by(PaymentSetting.id).all()


@router.post("/payments", response_model=PaymentSettingOut, status_code=201)
def create_payment(payload: PaymentSettingCreate, db: Session = Depends(get_db)):
    payment = PaymentSetting(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/payments/{payment_id}", response_model=PaymentSettingOut)
def update_payment(
    payment_id: int,
    payload: PaymentSettingUpdate,
    db: Session = Depends(get_db),
):
    payment = db.get(PaymentSetting, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình TT")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(payment, key, value)
    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}", response_model=Message)
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.get(PaymentSetting, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình TT")
    db.delete(payment)
    db.commit()
    return Message(detail="Đã xóa cấu hình thanh toán")


# ==================== SITE SETTINGS ====================
@router.get("/site-settings", response_model=list[SiteSettingOut])
def list_site_settings(db: Session = Depends(get_db)):
    return db.query(SiteSetting).order_by(SiteSetting.key).all()


@router.put("/site-settings/{key}", response_model=SiteSettingOut)
def upsert_site_setting(
    key: str, payload: SiteSettingUpdate, db: Session = Depends(get_db)
):
    """Cập nhật (hoặc tạo mới) một cấu hình site theo key."""
    setting = db.get(SiteSetting, key)
    if setting:
        setting.value = payload.value
    else:
        setting = SiteSetting(key=key, value=payload.value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


@router.delete("/site-settings/{key}", response_model=Message)
def delete_site_setting(key: str, db: Session = Depends(get_db)):
    setting = db.get(SiteSetting, key)
    if not setting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
    db.delete(setting)
    db.commit()
    return Message(detail="Đã xóa cấu hình")


# ==================== GUIDES ====================
_MD_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")


def _guide_image_urls(content: str | None) -> list[str]:
    """Lấy danh sách URL ảnh chèn trong nội dung bài hướng dẫn (markdown)."""
    return _MD_IMAGE_RE.findall(content or "")


def _unique_guide_slug(db: Session, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)
    slug, n = base, 1
    while True:
        q = db.query(Guide).filter(Guide.slug == slug)
        if exclude_id:
            q = q.filter(Guide.id != exclude_id)
        if not q.first():
            return slug
        n += 1
        slug = f"{base}-{n}"


@router.get("/guides", response_model=list[GuideOut])
def admin_list_guides(db: Session = Depends(get_db)):
    return db.query(Guide).order_by(Guide.sort_order, Guide.id).all()


@router.post("/guides", response_model=GuideOut, status_code=201)
def create_guide(payload: GuideCreate, db: Session = Depends(get_db)):
    guide = Guide(
        slug=_unique_guide_slug(db, payload.title),
        **payload.model_dump(),
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)
    return guide


@router.put("/guides/{guide_id}", response_model=GuideOut)
def update_guide(
    guide_id: int, payload: GuideUpdate, db: Session = Depends(get_db)
):
    guide = db.get(Guide, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài hướng dẫn")
    data = payload.model_dump(exclude_unset=True)
    if "content" in data:
        # Xóa khỏi storage các ảnh đã bị gỡ khỏi nội dung.
        old = set(_guide_image_urls(guide.content))
        new = set(_guide_image_urls(data["content"]))
        for url in old - new:
            delete_image(url)
    if "title" in data and data["title"]:
        guide.slug = _unique_guide_slug(db, data["title"], exclude_id=guide_id)
    for key, value in data.items():
        setattr(guide, key, value)
    db.commit()
    db.refresh(guide)
    return guide


@router.delete("/guides/{guide_id}", response_model=Message)
def delete_guide(guide_id: int, db: Session = Depends(get_db)):
    guide = db.get(Guide, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài hướng dẫn")
    # Xóa ảnh trong nội dung khỏi storage (gồm cả thư mục của bài).
    urls = _guide_image_urls(guide.content)
    for url in urls:
        delete_image(url)
    if urls:
        delete_folder_by_url(urls[0])
    db.delete(guide)
    db.commit()
    return Message(detail="Đã xóa bài hướng dẫn")


# ==================== ANNOUNCEMENTS (popup thông báo) ====================
@router.get("/announcements", response_model=list[AnnouncementOut])
def admin_list_announcements(db: Session = Depends(get_db)):
    return (
        db.query(Announcement)
        .order_by(Announcement.sort_order, Announcement.id)
        .all()
    )


@router.post("/announcements", response_model=AnnouncementOut, status_code=201)
def create_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db)):
    a = Announcement(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/announcements/{ann_id}", response_model=AnnouncementOut)
def update_announcement(
    ann_id: int, payload: AnnouncementUpdate, db: Session = Depends(get_db)
):
    a = db.get(Announcement, ann_id)
    if not a:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    data = payload.model_dump(exclude_unset=True)
    # Đổi/bỏ ảnh -> xóa ảnh cũ khỏi storage.
    if "image_url" in data and a.image_url and a.image_url != data.get("image_url"):
        delete_image(a.image_url)
    for key, value in data.items():
        setattr(a, key, value)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/announcements/{ann_id}", response_model=Message)
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    a = db.get(Announcement, ann_id)
    if not a:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    if a.image_url:
        delete_image(a.image_url)
    db.delete(a)
    db.commit()
    return Message(detail="Đã xóa thông báo")
