from sqlalchemy.orm import Session

from app.models import ContactSetting


def get_default_contact(db: Session) -> ContactSetting | None:
    """Lấy liên hệ mặc định đang hoạt động (ưu tiên is_default)."""
    return (
        db.query(ContactSetting)
        .filter(ContactSetting.is_active == True)
        .order_by(ContactSetting.is_default.desc(), ContactSetting.id)
        .first()
    )


def get_contact_for_account(db: Session, account) -> ContactSetting | None:
    """Liên hệ gắn với acc; nếu không có thì dùng liên hệ mặc định."""
    if account is not None and account.contact_id:
        contact = db.get(ContactSetting, account.contact_id)
        if contact and contact.is_active:
            return contact
    return get_default_contact(db)
