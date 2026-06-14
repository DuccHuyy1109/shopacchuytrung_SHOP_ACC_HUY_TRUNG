from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.user import AdminUserUpdate, UserOut
from app.services.maintenance import delete_user_data, purge_inactive_users

router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin - Người dùng"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=Page[UserOut])
def list_users(
    db: Session = Depends(get_db),
    q: str | None = None,
    role: str | None = Query(None, pattern="^(user|admin)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách toàn bộ người dùng."""
    query = db.query(User)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.full_name.ilike(like),
                User.phone.ilike(like),
                User.email.ilike(like),
            )
        )
    if role:
        query = query.filter(User.role == role)
    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [UserOut.model_validate(u) for u in users], total, page, page_size
    )


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Cập nhật người dùng (đổi quyền, khóa/mở khóa...)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.id == admin.id and (
        payload.role == "user" or payload.is_active is False
    ):
        raise HTTPException(
            status_code=400,
            detail="Không thể tự hạ quyền hoặc khóa chính tài khoản admin của bạn",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=Message)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="Không thể xóa chính tài khoản của bạn"
        )
    # Xóa sạch user + bài đăng / order / nạp tiền / giao dịch ví kèm ảnh trong kho.
    delete_user_data(db, user)
    return Message(detail="Đã xóa người dùng và toàn bộ dữ liệu liên quan")


@router.post("/cleanup-inactive", response_model=Message)
def cleanup_inactive(db: Session = Depends(get_db)):
    """Dọn ngay các tài khoản offline quá số ngày cấu hình (chạy tay)."""
    n = purge_inactive_users(db)
    return Message(detail=f"Đã dọn {n} tài khoản offline quá hạn")
