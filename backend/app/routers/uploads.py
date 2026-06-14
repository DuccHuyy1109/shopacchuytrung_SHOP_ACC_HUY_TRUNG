from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.site import get_setting
from app.services.storage import save_image

router = APIRouter(prefix="/api/uploads", tags=["Upload ảnh"])


def _watermark_text(db: Session, watermark: bool) -> str | None:
    if not watermark:
        return None
    return get_setting(db, "site_name", settings.PROJECT_NAME)


@router.post("/image")
def upload_image(
    file: UploadFile = File(...),
    folder: str | None = None,
    watermark: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Upload một ảnh, trả về URL.

    `folder` (tùy chọn) là thư mục lưu (vd mã acc, 'dang_bai/<id>').
    `watermark=true` sẽ phủ tên shop mờ lên ảnh (chống lấy cắp).
    """
    return {"url": save_image(file, folder, _watermark_text(db, watermark))}


@router.post("/images")
def upload_images(
    files: list[UploadFile] = File(...),
    folder: str | None = None,
    watermark: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Upload nhiều ảnh cùng lúc, trả về danh sách URL."""
    wm = _watermark_text(db, watermark)
    return {"urls": [save_image(f, folder, wm) for f in files]}
