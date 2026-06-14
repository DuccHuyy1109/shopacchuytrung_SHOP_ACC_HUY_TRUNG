from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models.user import User

# Chỉ ghi last_active_at nếu đã quá khoảng này — tránh ghi DB mỗi request.
_ACTIVITY_THROTTLE = timedelta(hours=1)

# auto_error=False: cho phép endpoint công khai vẫn nhận được request không token.
_bearer = HTTPBearer(auto_error=False)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token không hợp lệ hoặc đã hết hạn",
    headers={"WWW-Authenticate": "Bearer"},
)


def _user_from_token(
    credentials: HTTPAuthorizationCredentials | None, db: Session
) -> User | None:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        return None
    # Token bị vô hiệu sau khi đổi mật khẩu (version không khớp).
    if int(payload.get("ver", 0)) != int(user.token_version or 0):
        return None
    _touch_last_active(db, user)
    return user


def _touch_last_active(db: Session, user: User) -> None:
    """Đánh dấu user còn hoạt động (throttle 1 giờ). Lỗi thì bỏ qua."""
    now = datetime.utcnow()
    last = user.last_active_at
    if last is not None and now - last < _ACTIVITY_THROTTLE:
        return
    try:
        user.last_active_at = now
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Bắt buộc đăng nhập."""
    user = _user_from_token(credentials, db)
    if user is None:
        raise _CREDENTIALS_EXC
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """Cho phép cả khách (chưa đăng nhập)."""
    return _user_from_token(credentials, db)


def require_phone_user(current_user: User = Depends(get_current_user)) -> User:
    """Bắt buộc đăng nhập VÀ đã có số điện thoại trong hồ sơ.

    Dùng cho các chức năng cần liên hệ: order, đăng bài, liên hệ mua acc...
    """
    if not (current_user.phone or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cập nhật số điện thoại trong hồ sơ trước khi dùng "
            "chức năng này",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Bắt buộc quyền admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền thực hiện thao tác này",
        )
    return current_user
