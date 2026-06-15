from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased, selectinload

from app.core.deps import require_admin
from app.database import get_db
from app.models import Account, AccountContact, Post, PostContact, User
from app.schemas.admin import (
    AccountContactAdminOut,
    AccountContactStatusUpdate,
    PostContactAdminOut,
    PostStatusUpdate,
)
from app.schemas.common import Message, Page
from app.schemas.post import PostAdminOut, PostBulkStatus, PostPinUpdate
from app.services.storage import delete_folder_by_url, delete_image

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Bài đăng & Liên hệ"],
    dependencies=[Depends(require_admin)],
)


# ==================== POSTS ====================
@router.get("/posts", response_model=Page[PostAdminOut])
def list_posts(
    db: Session = Depends(get_db),
    q: str | None = None,
    status: str | None = Query(
        None, pattern="^(pending|approved|rejected|closed)$"
    ),
    post_type: str | None = Query(None, pattern="^(buy|sell)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách bài đăng — admin thấy đầy đủ danh tính người đăng."""
    query = db.query(Post).outerjoin(Post.author)
    if q:
        term = q.strip()
        like = f"%{term}%"
        conditions = [
            Post.title.ilike(like),
            Post.caption.ilike(like),
            User.username.ilike(like),
            User.full_name.ilike(like),
            User.phone.ilike(like),
            User.email.ilike(like),
        ]
        if term.isdigit():
            conditions.append(Post.id == int(term))
        query = query.filter(or_(*conditions))
    if status:
        query = query.filter(Post.status == status)
    if post_type:
        query = query.filter(Post.post_type == post_type)
    total = query.count()
    posts = (
        query.options(selectinload(Post.images), selectinload(Post.author))
        .order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [PostAdminOut.model_validate(p) for p in posts], total, page, page_size
    )


@router.post("/posts/bulk-status", response_model=Message)
def bulk_update_status(payload: PostBulkStatus, db: Session = Depends(get_db)):
    """Duyệt / từ chối nhiều bài đăng cùng lúc."""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Chưa chọn bài nào")
    db.query(Post).filter(Post.id.in_(payload.ids)).update(
        {Post.status: payload.status}, synchronize_session=False
    )
    db.commit()
    label = "duyệt" if payload.status == "approved" else "từ chối"
    return Message(detail=f"Đã {label} {len(payload.ids)} bài")


@router.put("/posts/{post_id}/pin", response_model=PostAdminOut)
def pin_post(
    post_id: int, payload: PostPinUpdate, db: Session = Depends(get_db)
):
    """Ghim / bỏ ghim bài đăng (bài ghim hiển thị đầu feed)."""
    post = (
        db.query(Post)
        .options(selectinload(Post.images), selectinload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    post.is_pinned = payload.is_pinned
    db.commit()
    db.refresh(post)
    return post


@router.get("/posts/{post_id}", response_model=PostAdminOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(Post)
        .options(selectinload(Post.images), selectinload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    return post


@router.put("/posts/{post_id}/status", response_model=PostAdminOut)
def update_post_status(
    post_id: int, payload: PostStatusUpdate, db: Session = Depends(get_db)
):
    """Duyệt / từ chối / đóng bài đăng."""
    post = (
        db.query(Post)
        .options(selectinload(Post.images), selectinload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    post.status = payload.status
    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}", response_model=Message)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    # Xóa ảnh khỏi storage (gồm cả thư mục của bài).
    urls = [img.image_url for img in post.images]
    for url in urls:
        delete_image(url)
    if urls:
        delete_folder_by_url(urls[0])
    db.query(PostContact).filter(PostContact.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return Message(detail="Đã xóa bài đăng")


# ==================== POST CONTACTS (ai mua - ai bán) ====================
@router.get("/post-contacts", response_model=Page[PostContactAdminOut])
def list_post_contacts(
    db: Session = Depends(get_db),
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lịch sử liên hệ qua bài đăng — đầy đủ thông tin người mua/người bán."""
    Interested = aliased(User)
    Poster = aliased(User)
    query = (
        db.query(PostContact)
        .outerjoin(Post, PostContact.post_id == Post.id)
        .outerjoin(Interested, PostContact.interested_user_id == Interested.id)
        .outerjoin(Poster, PostContact.poster_user_id == Poster.id)
    )
    if q:
        term = q.strip()
        like = f"%{term}%"
        conditions = [
            Post.title.ilike(like),
            Interested.username.ilike(like),
            Interested.full_name.ilike(like),
            Interested.phone.ilike(like),
            Interested.email.ilike(like),
            Poster.username.ilike(like),
            Poster.full_name.ilike(like),
            Poster.phone.ilike(like),
            Poster.email.ilike(like),
        ]
        if term.isdigit():
            n = int(term)
            conditions.extend([PostContact.id == n, PostContact.post_id == n])
        query = query.filter(or_(*conditions))
    total = query.count()
    rows = (
        query.options(
            selectinload(PostContact.post).selectinload(Post.images),
            selectinload(PostContact.interested_user),
            selectinload(PostContact.poster_user),
        )
        .order_by(PostContact.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [PostContactAdminOut.model_validate(r) for r in rows],
        total,
        page,
        page_size,
    )


@router.delete("/post-contacts/{contact_id}", response_model=Message)
def delete_post_contact(contact_id: int, db: Session = Depends(get_db)):
    """Xóa một lượt liên hệ qua bài đăng."""
    record = db.get(PostContact, contact_id)
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ")
    db.delete(record)
    db.commit()
    return Message(detail="Đã xóa liên hệ")


# ==================== ACCOUNT CONTACTS (liên hệ mua acc) ====================
@router.get("/account-contacts", response_model=Page[AccountContactAdminOut])
def list_account_contacts(
    db: Session = Depends(get_db),
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lịch sử khách nhấn 'Liên hệ mua' acc."""
    query = (
        db.query(AccountContact)
        .outerjoin(Account, AccountContact.account_id == Account.id)
        .outerjoin(User, AccountContact.user_id == User.id)
    )
    if q:
        term = q.strip()
        like = f"%{term}%"
        conditions = [
            Account.account_code.ilike(like),
            AccountContact.customer_name.ilike(like),
            AccountContact.customer_phone.ilike(like),
            User.username.ilike(like),
            User.full_name.ilike(like),
            User.phone.ilike(like),
            User.email.ilike(like),
        ]
        if term.isdigit():
            n = int(term)
            conditions.extend([AccountContact.id == n, AccountContact.account_id == n])
        query = query.filter(or_(*conditions))
    total = query.count()
    rows = (
        query.options(
            selectinload(AccountContact.account),
            selectinload(AccountContact.user),
        )
        .order_by(AccountContact.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [AccountContactAdminOut.model_validate(r) for r in rows],
        total,
        page,
        page_size,
    )


@router.put(
    "/account-contacts/{contact_id}", response_model=AccountContactAdminOut
)
def update_account_contact_status(
    contact_id: int,
    payload: AccountContactStatusUpdate,
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái xử lý liên hệ mua acc."""
    record = (
        db.query(AccountContact)
        .options(
            selectinload(AccountContact.account),
            selectinload(AccountContact.user),
        )
        .filter(AccountContact.id == contact_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ")
    record.status = payload.status
    db.commit()
    db.refresh(record)
    return record


@router.delete("/account-contacts/{contact_id}", response_model=Message)
def delete_account_contact(contact_id: int, db: Session = Depends(get_db)):
    """Xóa một lượt liên hệ mua acc."""
    record = db.get(AccountContact, contact_id)
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ")
    db.delete(record)
    db.commit()
    return Message(detail="Đã xóa liên hệ")
