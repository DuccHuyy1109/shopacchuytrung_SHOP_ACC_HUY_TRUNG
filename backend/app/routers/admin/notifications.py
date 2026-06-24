"""Bảng thông báo trong-app cho trang quản trị.

Gom 5 nguồn cần admin để mắt tới:
  • orders            — Đơn order acc
  • account_contacts  — Liên hệ mua acc
  • posts             — Bài đăng mới của người dùng
  • post_contacts     — Liên hệ qua bài đăng
  • deposits          — Yêu cầu nạp tiền (đã CK, chờ xác nhận)

Trạng thái "mới/đã đọc" lưu trong site_settings, KHÔNG cần migrate DB:
  • notif_seen_<cat>  — mốc id (watermark): mọi bản ghi id <= mốc coi như cũ.
  • notif_read_<cat>  — danh sách id ĐÃ ĐỌC LẺ nằm trên watermark (JSON).

Một thông báo là "mới" khi: id > watermark VÀ id chưa nằm trong danh sách đọc lẻ.
Nhờ vậy bấm vào 1 mục chỉ tắt chấm xanh của đúng mục đó; "đọc tất cả" thì nâng
watermark lên max id và xoá danh sách đọc lẻ. Dùng id auto-increment để tránh
hoàn toàn rắc rối múi giờ giữa các loại CSDL.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_admin
from app.database import get_db
from app.models import (
    AccountContact,
    DepositRequest,
    Order,
    Post,
    PostContact,
    SiteSetting,
)
from app.schemas.admin import (
    NotificationCategory,
    NotificationItem,
    NotificationReadIn,
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
# Giới hạn kích thước danh sách "đọc lẻ" để không phình vô hạn.
READ_LIST_CAP = 500

CATEGORY_LABELS = {
    "orders": "Đơn order acc",
    "account_contacts": "Liên hệ mua acc",
    "posts": "Bài đăng",
    "post_contacts": "Liên hệ bài đăng",
    "deposits": "Yêu cầu nạp tiền",
}

MODEL_BY_CATEGORY = {
    "orders": Order,
    "account_contacts": AccountContact,
    "posts": Post,
    "post_contacts": PostContact,
    "deposits": DepositRequest,
}


def _seen_key(category: str) -> str:
    return f"notif_seen_{category}"


def _read_key(category: str) -> str:
    return f"notif_read_{category}"


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
            key=key, description=f"Mốc id thông báo '{category}' đã xem"
        )
        db.add(s)
    s.value = str(value)


def _get_read_ids(db: Session, category: str, watermark: int = 0) -> set[int]:
    """Tập id đã đọc lẻ (đã loại bỏ những id <= watermark cho gọn)."""
    s = db.get(SiteSetting, _read_key(category))
    if not s or not s.value:
        return set()
    try:
        ids = json.loads(s.value)
        return {int(i) for i in ids if int(i) > watermark}
    except (ValueError, TypeError):
        return set()


def _set_read_ids(db: Session, category: str, ids: set[int]) -> None:
    key = _read_key(category)
    s = db.get(SiteSetting, key)
    if not s:
        s = SiteSetting(
            key=key, description=f"Id thông báo '{category}' đã đọc lẻ"
        )
        db.add(s)
    # Giữ tối đa READ_LIST_CAP id lớn nhất.
    trimmed = sorted(ids, reverse=True)[:READ_LIST_CAP]
    s.value = json.dumps(trimmed)


def _max_id(db: Session, model) -> int:
    return int(db.query(func.coalesce(func.max(model.id), 0)).scalar() or 0)


def _unread_count(db: Session, model, watermark: int, read_ids: set[int]) -> int:
    q = db.query(func.count(model.id)).filter(model.id > watermark)
    if read_ids:
        q = q.filter(~model.id.in_(read_ids))
    return int(q.scalar() or 0)


def _is_new(item_id: int, watermark: int, read_ids: set[int]) -> bool:
    return item_id > watermark and item_id not in read_ids


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
    wm = _get_seen_id(db, "orders")
    read = _get_read_ids(db, "orders", wm)
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
            is_new=_is_new(o.id, wm, read),
        )
        for o in rows
    ]
    return NotificationCategory(
        key="orders",
        label=CATEGORY_LABELS["orders"],
        unread=_unread_count(db, Order, wm, read),
        items=items,
    )


def _account_contacts_category(db: Session) -> NotificationCategory:
    wm = _get_seen_id(db, "account_contacts")
    read = _get_read_ids(db, "account_contacts", wm)
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
                is_new=_is_new(c.id, wm, read),
            )
        )
    return NotificationCategory(
        key="account_contacts",
        label=CATEGORY_LABELS["account_contacts"],
        unread=_unread_count(db, AccountContact, wm, read),
        items=items,
    )


def _posts_category(db: Session) -> NotificationCategory:
    wm = _get_seen_id(db, "posts")
    read = _get_read_ids(db, "posts", wm)
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
                is_new=_is_new(p.id, wm, read),
            )
        )
    return NotificationCategory(
        key="posts",
        label=CATEGORY_LABELS["posts"],
        unread=_unread_count(db, Post, wm, read),
        items=items,
    )


def _post_contacts_category(db: Session) -> NotificationCategory:
    wm = _get_seen_id(db, "post_contacts")
    read = _get_read_ids(db, "post_contacts", wm)
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
        role = (
            "Người mua quan tâm"
            if pc.interested_role == "buyer"
            else "Người bán quan tâm"
        )
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
                is_new=_is_new(pc.id, wm, read),
            )
        )
    return NotificationCategory(
        key="post_contacts",
        label=CATEGORY_LABELS["post_contacts"],
        unread=_unread_count(db, PostContact, wm, read),
        items=items,
    )


def _deposits_category(db: Session) -> NotificationCategory:
    wm = _get_seen_id(db, "deposits")
    read = _get_read_ids(db, "deposits", wm)
    rows = (
        db.query(DepositRequest)
        .options(selectinload(DepositRequest.user))
        .order_by(DepositRequest.id.desc())
        .limit(PER_CATEGORY_LIMIT)
        .all()
    )
    items = [
        NotificationItem(
            id=d.id,
            title=f"Nạp {d.deposit_code}",
            subtitle=_who(d.user),
            meta=_fmt_price(d.amount),
            created_at=d.created_at,
            is_new=_is_new(d.id, wm, read),
        )
        for d in rows
    ]
    return NotificationCategory(
        key="deposits",
        label=CATEGORY_LABELS["deposits"],
        unread=_unread_count(db, DepositRequest, wm, read),
        items=items,
    )


@router.get("/notifications", response_model=NotificationSummary)
def get_notifications(db: Session = Depends(get_db)):
    """Tổng hợp thông báo cho 5 mục + số chưa đọc từng mục."""
    categories = [
        _orders_category(db),
        _account_contacts_category(db),
        _posts_category(db),
        _post_contacts_category(db),
        _deposits_category(db),
    ]
    total = sum(c.unread for c in categories)
    return NotificationSummary(total_unread=total, categories=categories)


@router.post("/notifications/read", response_model=Message)
def mark_one_read(payload: NotificationReadIn, db: Session = Depends(get_db)):
    """Đánh dấu đã đọc MỘT thông báo (chỉ tắt chấm của đúng mục đó)."""
    cat = payload.category
    wm = _get_seen_id(db, cat)
    if payload.id > wm:
        read = _get_read_ids(db, cat, wm)
        read.add(payload.id)
        _set_read_ids(db, cat, read)
        db.commit()
    return Message(detail="Đã đọc thông báo")


@router.post("/notifications/seen", response_model=Message)
def mark_seen(payload: NotificationSeenIn, db: Session = Depends(get_db)):
    """Đánh dấu đã đọc một mục (hoặc tất cả) — nâng watermark, xoá danh sách đọc lẻ."""
    targets = (
        list(MODEL_BY_CATEGORY)
        if payload.category == "all"
        else [payload.category]
    )
    for cat in targets:
        _set_seen_id(db, cat, _max_id(db, MODEL_BY_CATEGORY[cat]))
        _set_read_ids(db, cat, set())
    db.commit()
    return Message(detail="Đã đánh dấu đã đọc")
