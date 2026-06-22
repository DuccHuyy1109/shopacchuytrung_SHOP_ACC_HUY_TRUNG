"""Bảng thông báo trong-app cho trang quản trị.

Gom 4 nguồn cần admin để mắt tới:
  • orders            — Đơn order acc
  • account_contacts  — Liên hệ mua acc
  • posts             — Bài đăng mới của người dùng
  • post_contacts     — Liên hệ qua bài đăng

"Mới/chưa đọc" được xác định bằng cách so id của bản ghi với mốc id đã xem
gần nhất (lưu trong site_settings). Dùng id auto-increment thay vì thời gian
để tránh hoàn toàn rắc rối múi giờ giữa các loại CSDL (SQLite/SQL Server/PG).
Đánh dấu đã đọc = nâng mốc id lên id lớn nhất hiện có của mục đó.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_admin
from app.database import get_db
from app.models import (
    AccountContact,
    Order,
    Post,
    PostContact,
    SiteSetting,
)
from app.schemas.admin import (
    NotificationCategory,
    NotificationItem,
    NotificationSeenIn,
    NotificationSummary,
)
from app.schemas.common import Message

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Thông báo"],
    dependencies=[Depends(require_admin)],
)

# Số dòng tối đa hiển thị mỗi mục trong bảng thông báo.
PER_CATEGORY_LIMIT = 12

CATEGORY_LABELS = {
    "orders": "Đơn order acc",
    "account_contacts": "Liên hệ mua acc",
    "posts": "Bài đăng",
    "post_contacts": "Liên hệ bài đăng",
}

MODEL_BY_CATEGORY = {
    "orders": Order,
    "account_contacts": AccountContact,
    "posts": Post,
    "post_contacts": PostContact,
}


def _seen_key(category: str) -> str:
    return f"notif_seen_{category}"


def _get_seen_id(db: Session, category: str) -> int:
    s = db.get(SiteSetting, _seen_key(category))
    if s and s.value and str(s.value).isdigit():
        return int(s.value)
    return 0


def _set_seen_id(db: Session, category: str, value: int) -> None:
    key = _seen_key(category)
    s = db.get(SiteSetting, key)
    if not s:
        s = SiteSetting(
            key=key,
            description=f"ID thông báo '{category}' admin đã xem gần nhất",
        )
        db.add(s)
    s.value = str(value)


def _max_id(db: Session, model) -> int:
    return int(db.query(func.coalesce(func.max(model.id), 0)).scalar() or 0)


def _fmt_price(value) -> str | None:
    try:
        if value is None:
            return None
        return f"{int(value):,}".replace(",", ".") + "₫"
    except (TypeError, ValueError):
        return None


def _short(text: str | None, limit: int = 60) -> str | None:
    if not text:
        return None
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _who(user) -> str | None:
    if not user:
        return None
    name = user.full_name or user.username
    return f"{name} · {user.phone}" if getattr(user, "phone", None) else name


# ----------------------------- Build từng mục ----------------------------- #
def _orders_category(db: Session) -> NotificationCategory:
    seen = _get_seen_id(db, "orders")
    unread = (
        db.query(func.count(Order.id)).filter(Order.id > seen).scalar() or 0
    )
    rows = db.query(Order).order_by(Order.id.desc()).limit(PER_CATEGORY_LIMIT).all()
    items = [
        NotificationItem(
            id=o.id,
            title=f"#{o.order_code}",
            subtitle=" · ".join(
                p for p in (o.customer_name, o.customer_phone) if p
            )
            or None,
            meta=_fmt_price(o.desired_price or o.amount),
            created_at=o.created_at,
            is_new=o.id > seen,
        )
        for o in rows
    ]
    return NotificationCategory(
        key="orders", label=CATEGORY_LABELS["orders"], unread=int(unread), items=items
    )


def _account_contacts_category(db: Session) -> NotificationCategory:
    seen = _get_seen_id(db, "account_contacts")
    unread = (
        db.query(func.count(AccountContact.id))
        .filter(AccountContact.id > seen)
        .scalar()
        or 0
    )
    rows = (
        db.query(AccountContact)
        .options(
            selectinload(AccountContact.account),
            selectinload(AccountContact.user),
        )
        .order_by(AccountContact.id.desc())
        .limit(PER_CATEGORY_LIMIT)
        .all()
    )
    items = []
    for c in rows:
        acc_code = c.account.account_code if c.account else "?"
        contact = (
            " · ".join(p for p in (c.customer_name, c.customer_phone) if p)
            or _who(c.user)
            or "Khách vãng lai"
        )
        items.append(
            NotificationItem(
                id=c.id,
                title=f"Acc {acc_code}",
                subtitle=contact,
                meta=_fmt_price(c.account.sale_price) if c.account else None,
                created_at=c.created_at,
                is_new=c.id > seen,
            )
        )
    return NotificationCategory(
        key="account_contacts",
        label=CATEGORY_LABELS["account_contacts"],
        unread=int(unread),
        items=items,
    )


def _posts_category(db: Session) -> NotificationCategory:
    seen = _get_seen_id(db, "posts")
    unread = (
        db.query(func.count(Post.id)).filter(Post.id > seen).scalar() or 0
    )
    rows = (
        db.query(Post)
        .options(selectinload(Post.author))
        .order_by(Post.id.desc())
        .limit(PER_CATEGORY_LIMIT)
        .all()
    )
    items = []
    for p in rows:
        kind = "Cần mua" if p.post_type == "buy" else "Cần bán"
        author = p.author.username if p.author else None
        title = _short(p.title or p.caption, 56) or f"Bài #{p.id}"
        items.append(
            NotificationItem(
                id=p.id,
                title=title,
                subtitle=" · ".join(
                    x for x in (kind, f"@{author}" if author else None) if x
                )
                or None,
                meta=_fmt_price(p.price),
                created_at=p.created_at,
                is_new=p.id > seen,
            )
        )
    return NotificationCategory(
        key="posts", label=CATEGORY_LABELS["posts"], unread=int(unread), items=items
    )


def _post_contacts_category(db: Session) -> NotificationCategory:
    seen = _get_seen_id(db, "post_contacts")
    unread = (
        db.query(func.count(PostContact.id))
        .filter(PostContact.id > seen)
        .scalar()
        or 0
    )
    rows = (
        db.query(PostContact)
        .options(
            selectinload(PostContact.post),
            selectinload(PostContact.interested_user),
            selectinload(PostContact.poster_user),
        )
        .order_by(PostContact.id.desc())
        .limit(PER_CATEGORY_LIMIT)
        .all()
    )
    items = []
    for pc in rows:
        role = "Người mua quan tâm" if pc.interested_role == "buyer" else "Người bán quan tâm"
        post_title = _short(pc.post.title, 48) if pc.post else None
        items.append(
            NotificationItem(
                id=pc.id,
                title=f"Liên hệ bài #{pc.post_id}",
                subtitle=" · ".join(
                    x for x in (role, _who(pc.interested_user)) if x
                )
                or None,
                meta=post_title,
                created_at=pc.created_at,
                is_new=pc.id > seen,
            )
        )
    return NotificationCategory(
        key="post_contacts",
        label=CATEGORY_LABELS["post_contacts"],
        unread=int(unread),
        items=items,
    )


@router.get("/notifications", response_model=NotificationSummary)
def get_notifications(db: Session = Depends(get_db)):
    """Tổng hợp thông báo cho 4 mục + số chưa đọc từng mục."""
    categories = [
        _orders_category(db),
        _account_contacts_category(db),
        _posts_category(db),
        _post_contacts_category(db),
    ]
    total = sum(c.unread for c in categories)
    return NotificationSummary(total_unread=total, categories=categories)


@router.post("/notifications/seen", response_model=Message)
def mark_seen(payload: NotificationSeenIn, db: Session = Depends(get_db)):
    """Đánh dấu đã đọc một mục (hoặc tất cả) — nâng mốc id đã xem."""
    targets = (
        list(MODEL_BY_CATEGORY)
        if payload.category == "all"
        else [payload.category]
    )
    for cat in targets:
        _set_seen_id(db, cat, _max_id(db, MODEL_BY_CATEGORY[cat]))
    db.commit()
    return Message(detail="Đã đánh dấu đã đọc")
