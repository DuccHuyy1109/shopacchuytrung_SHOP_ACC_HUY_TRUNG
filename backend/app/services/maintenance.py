"""Dọn dữ liệu để hệ thống chạy bền: xóa sạch user + tài nguyên liên quan
(bài đăng, order, yêu cầu nạp, giao dịch ví) kèm ảnh trong kho, và tự động
xóa tài khoản offline quá lâu.
"""

import logging
import time
from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AccountContact,
    DepositRequest,
    Order,
    Post,
    PostContact,
    User,
    WalletTransaction,
)
from app.services.site import get_setting
from app.services.storage import (
    delete_folder,
    delete_folder_by_url,
    delete_image,
)

logger = logging.getLogger("maintenance")


def delete_user_data(db: Session, user: User) -> None:
    """Xóa một user và TOÀN BỘ dữ liệu liên quan, kèm ảnh trong kho.

    Ảnh chỉ được xóa SAU khi commit DB thành công (tránh mất ảnh nếu rollback).
    """
    user_id = user.id

    # --- Thu thập ảnh cần xóa (xóa khỏi kho sau khi commit) ---
    image_urls: list[str] = []
    post_folder_anchor: list[str] = []
    folders: list[str] = []

    posts = (
        db.query(Post)
        .options(selectinload(Post.images))
        .filter(Post.user_id == user_id)
        .all()
    )
    post_ids = [p.id for p in posts]
    for p in posts:
        urls = [img.image_url for img in p.images]
        image_urls.extend(urls)
        if urls:
            post_folder_anchor.append(urls[0])

    orders = db.query(Order).filter(Order.user_id == user_id).all()
    folders.extend(f"orders/{o.order_code}" for o in orders)

    deposits = db.query(DepositRequest).filter(
        DepositRequest.user_id == user_id
    ).all()
    folders.extend(f"deposits/{d.deposit_code}" for d in deposits)

    # --- Xóa bản ghi DB ---
    # Liên hệ qua bài (cả bài của user lẫn các bài user tương tác).
    if post_ids:
        db.query(PostContact).filter(
            PostContact.post_id.in_(post_ids)
        ).delete(synchronize_session=False)
    db.query(PostContact).filter(
        or_(
            PostContact.interested_user_id == user_id,
            PostContact.poster_user_id == user_id,
        )
    ).delete(synchronize_session=False)

    for p in posts:
        db.delete(p)  # ảnh (PostImage) xóa theo cascade quan hệ
    db.query(WalletTransaction).filter(
        WalletTransaction.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(DepositRequest).filter(
        DepositRequest.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(AccountContact).filter(
        AccountContact.user_id == user_id
    ).delete(synchronize_session=False)
    for o in orders:
        db.delete(o)  # AccountImage không liên quan; bill nằm ở storage folder

    db.delete(user)
    db.commit()

    # --- Xóa ảnh khỏi kho (sau commit) ---
    for url in image_urls:
        delete_image(url)
    for anchor in post_folder_anchor:
        delete_folder_by_url(anchor)
    for folder in folders:
        delete_folder(folder)


def purge_inactive_users(db: Session) -> int:
    """Xóa các tài khoản (không phải admin) đã offline quá số ngày cấu hình.

    Số ngày lấy từ site setting `inactive_account_days` (mặc định 7). Trả về
    số tài khoản đã xóa. An toàn: bỏ qua user chưa có mốc last_active_at.
    """
    try:
        days = int(get_setting(db, "inactive_account_days", "7") or 7)
    except (TypeError, ValueError):
        days = 7
    if days <= 0:
        return 0

    cutoff = datetime.utcnow() - timedelta(days=days)
    stale = (
        db.query(User)
        .filter(
            User.role != "admin",
            User.last_active_at.isnot(None),
            User.last_active_at < cutoff,
        )
        .all()
    )
    count = 0
    for user in stale:
        try:
            delete_user_data(db, user)
            count += 1
        except Exception:  # noqa: BLE001
            db.rollback()
            logger.exception("Không xóa được user offline #%s", user.id)
    if count:
        logger.info("Đã tự dọn %s tài khoản offline > %s ngày", count, days)
    return count


# --- Tự động dọn định kỳ (throttle) — kích hoạt nhờ lượt ping /health ---
_PURGE_INTERVAL = 12 * 60 * 60  # tối đa chạy 1 lần mỗi 12 giờ
_last_purge_at = 0.0


def maybe_purge_inactive(db: Session) -> None:
    """Chạy purge nếu đã quá _PURGE_INTERVAL kể từ lần trước. Nuốt mọi lỗi
    để không bao giờ làm hỏng endpoint gọi nó (vd /health)."""
    global _last_purge_at
    now = time.time()
    if now - _last_purge_at < _PURGE_INTERVAL:
        return
    _last_purge_at = now
    try:
        purge_inactive_users(db)
    except Exception:  # noqa: BLE001
        logger.exception("maybe_purge_inactive lỗi")
