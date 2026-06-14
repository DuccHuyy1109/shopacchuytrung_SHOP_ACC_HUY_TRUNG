from sqlalchemy.orm import Session

from app.models import SiteSetting


def get_setting(db: Session, key: str, default: str | None = None) -> str | None:
    """Đọc một cấu hình site theo key."""
    setting = db.get(SiteSetting, key)
    if setting and setting.value not in (None, ""):
        return setting.value
    return default
