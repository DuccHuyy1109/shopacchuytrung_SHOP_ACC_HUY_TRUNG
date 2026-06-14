from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core import ratelimit
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import User
from app.schemas.common import Message
from app.schemas.user import (
    AccessTokenOut,
    PasswordChange,
    RefreshRequest,
    Token,
    UserLogin,
    UserOut,
    UserRegister,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["Xác thực"])


def _issue_token(user: User) -> Token:
    ver = int(user.token_version or 0)
    return Token(
        access_token=create_access_token(user.id, user.role, ver),
        refresh_token=create_refresh_token(user.id, ver),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Đăng ký tài khoản người dùng mới."""
    username = payload.username.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="Tên đăng nhập đã tồn tại")
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email đã được sử dụng")

    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


def _client_ip(request: Request) -> str:
    """IP client — ưu tiên X-Forwarded-For (hop đầu) khi chạy sau proxy."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Đăng nhập, trả về access token + refresh token.

    Chống dò mật khẩu: tối đa 10 lần sai / IP trong 15 phút, vượt thì 429.
    """
    ip = _client_ip(request)
    wait = ratelimit.retry_after(ip)
    if wait > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau "
            f"{wait // 60 + 1} phút.",
            headers={"Retry-After": str(wait)},
        )

    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        ratelimit.record_failure(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa")
    ratelimit.reset(ip)
    return _issue_token(user)


@router.post("/refresh", response_model=AccessTokenOut)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Lấy access token mới từ refresh token."""
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ")
    user = db.query(User).filter(User.id == int(data["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không khả dụng")
    # Refresh token cũ (đã đổi mật khẩu) -> từ chối.
    if int(data.get("ver", 0)) != int(user.token_version or 0):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn")
    return AccessTokenOut(
        access_token=create_access_token(
            user.id, user.role, int(user.token_version or 0)
        )
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Thông tin tài khoản đang đăng nhập."""
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cập nhật hồ sơ cá nhân."""
    if payload.email and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=409, detail="Email đã được sử dụng")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=Token)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đổi mật khẩu — tăng token_version để vô hiệu mọi phiên cũ, cấp token mới
    cho phiên hiện tại."""
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.token_version = int(current_user.token_version or 0) + 1
    db.commit()
    db.refresh(current_user)
    return _issue_token(current_user)
