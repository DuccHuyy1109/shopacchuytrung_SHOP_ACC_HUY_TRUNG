from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models import Account, AccountContact, Order, Post, PostContact
from app.models.user import User
from app.schemas.admin import (
    DashboardStats,
    DashboardTimePoint,
    DashboardTopAccount,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Dashboard"],
    dependencies=[Depends(require_admin)],
)


def _build_timeseries(db: Session, days: int = 14) -> list[DashboardTimePoint]:
    """Số acc & đơn tạo mới theo từng ngày (gộp trong Python để không phụ thuộc
    cú pháp ngày của từng loại CSDL — tương thích cả SQL Server lẫn Postgres)."""
    start = (datetime.now() - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    buckets: dict[str, dict[str, int]] = {
        (start + timedelta(days=i)).date().isoformat(): {"accounts": 0, "orders": 0}
        for i in range(days)
    }
    for (created,) in db.query(Account.created_at).filter(
        Account.created_at >= start
    ):
        if created:
            key = created.date().isoformat()
            if key in buckets:
                buckets[key]["accounts"] += 1
    for (created,) in db.query(Order.created_at).filter(Order.created_at >= start):
        if created:
            key = created.date().isoformat()
            if key in buckets:
                buckets[key]["orders"] += 1
    return [
        DashboardTimePoint(date=k, accounts=v["accounts"], orders=v["orders"])
        for k, v in buckets.items()
    ]


def _top_accounts(db: Session, limit: int = 5) -> list[DashboardTopAccount]:
    """Acc được quan tâm nhất (theo số lượt 'Liên hệ mua')."""
    rows = (
        db.query(
            AccountContact.account_id,
            func.count(AccountContact.id).label("cnt"),
        )
        .group_by(AccountContact.account_id)
        .order_by(func.count(AccountContact.id).desc())
        .limit(limit)
        .all()
    )
    out: list[DashboardTopAccount] = []
    for account_id, cnt in rows:
        acc = db.get(Account, account_id)
        if not acc:
            continue
        out.append(
            DashboardTopAccount(
                id=acc.id,
                account_code=acc.account_code,
                sale_price=float(acc.sale_price or 0),
                contact_count=int(cnt),
                view_count=int(acc.view_count or 0),
            )
        )
    return out


def _top_viewed(db: Session, limit: int = 5) -> list[DashboardTopAccount]:
    """Acc được nhấn xem nhiều nhất (theo view_count)."""
    rows = (
        db.query(Account)
        .order_by(Account.view_count.desc())
        .limit(limit)
        .all()
    )
    contact_counts = dict(
        db.query(AccountContact.account_id, func.count(AccountContact.id))
        .group_by(AccountContact.account_id)
        .all()
    )
    return [
        DashboardTopAccount(
            id=acc.id,
            account_code=acc.account_code,
            sale_price=float(acc.sale_price or 0),
            contact_count=int(contact_counts.get(acc.id, 0)),
            view_count=int(acc.view_count or 0),
        )
        for acc in rows
    ]


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    """Thống kê tổng quan + nâng cao cho trang quản trị."""
    month_start = datetime.now().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    confirmed = Order.payment_status == "confirmed"
    deposit_revenue = (
        db.query(func.coalesce(func.sum(Order.amount), 0))
        .filter(confirmed)
        .scalar()
    )
    revenue_month = (
        db.query(func.coalesce(func.sum(Order.amount), 0))
        .filter(confirmed, Order.created_at >= month_start)
        .scalar()
    )

    return DashboardStats(
        total_users=db.query(User).count(),
        total_accounts=db.query(Account).count(),
        available_accounts=db.query(Account)
        .filter(Account.status == "available")
        .count(),
        sold_accounts=db.query(Account).filter(Account.status == "sold").count(),
        total_orders=db.query(Order).count(),
        pending_orders=db.query(Order).filter(Order.status == "pending").count(),
        paid_orders=db.query(Order).filter(confirmed).count(),
        total_posts=db.query(Post).count(),
        pending_posts=db.query(Post).filter(Post.status == "pending").count(),
        approved_posts=db.query(Post).filter(Post.status == "approved").count(),
        total_account_contacts=db.query(AccountContact).count(),
        total_post_contacts=db.query(PostContact).count(),
        deposit_revenue=float(deposit_revenue or 0),
        revenue_this_month=float(revenue_month or 0),
        orders_pending_confirm=db.query(Order)
        .filter(Order.payment_status == "pending_confirm")
        .count(),
        timeseries=_build_timeseries(db),
        top_accounts=_top_accounts(db),
        top_viewed=_top_viewed(db),
    )
