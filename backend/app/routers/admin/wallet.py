from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models import Account, DepositRequest, User, WalletTransaction
from app.schemas.common import Message, Page
from app.schemas.wallet import (
    BalanceAdjust,
    DepositAdminOut,
    DepositReject,
    PurchaseAdminOut,
    WalletTransactionAdminOut,
)
from app.services import wallet as wallet_service
from app.services.storage import delete_folder

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Tài chính"],
    dependencies=[Depends(require_admin)],
)


def _to_admin_out(d: DepositRequest) -> DepositAdminOut:
    out = DepositAdminOut.model_validate(d)
    if d.user:
        out.username = d.user.username
        out.full_name = d.user.full_name
        out.phone = d.user.phone
    return out


@router.get("/deposits", response_model=Page[DepositAdminOut])
def list_deposits(
    db: Session = Depends(get_db),
    q: str | None = None,
    status: str | None = Query(None, pattern="^(pending|confirmed|rejected)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách yêu cầu nạp tiền."""
    query = db.query(DepositRequest).join(User, DepositRequest.user_id == User.id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                DepositRequest.deposit_code.ilike(like),
                DepositRequest.transfer_content.ilike(like),
                User.username.ilike(like),
                User.full_name.ilike(like),
                User.phone.ilike(like),
            )
        )
    if status:
        query = query.filter(DepositRequest.status == status)
    total = query.count()
    rows = (
        query.order_by(DepositRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [_to_admin_out(d) for d in rows], total, page, page_size
    )


@router.post("/deposits/{deposit_id}/confirm", response_model=DepositAdminOut)
def confirm_deposit(deposit_id: int, db: Session = Depends(get_db)):
    """Xác nhận yêu cầu nạp -> cộng tiền vào ví (idempotent: chỉ khi đang chờ)."""
    deposit = db.get(DepositRequest, deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu nạp")
    if deposit.status != "pending":
        raise HTTPException(
            status_code=400, detail="Yêu cầu nạp này đã được xử lý"
        )

    # Khóa dòng user trước khi cộng tiền để chống đua lệnh / cộng trùng.
    user = wallet_service.lock_user(db, deposit.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    wallet_service.credit(
        db,
        user,
        deposit.amount,
        tx_type="deposit",
        note=f"Nạp tiền {deposit.deposit_code}",
        ref_type="deposit",
        ref_id=deposit.id,
    )
    deposit.status = "confirmed"
    deposit.confirmed_at = datetime.utcnow()
    db.commit()
    db.refresh(deposit)
    return _to_admin_out(deposit)


@router.post("/deposits/{deposit_id}/reject", response_model=DepositAdminOut)
def reject_deposit(
    deposit_id: int,
    payload: DepositReject | None = None,
    db: Session = Depends(get_db),
):
    """Từ chối yêu cầu nạp (không cộng tiền)."""
    deposit = db.get(DepositRequest, deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu nạp")
    if deposit.status != "pending":
        raise HTTPException(
            status_code=400, detail="Yêu cầu nạp này đã được xử lý"
        )
    deposit.status = "rejected"
    deposit.admin_note = payload.note if payload else None
    db.commit()
    db.refresh(deposit)
    return _to_admin_out(deposit)


@router.delete("/deposits/{deposit_id}", response_model=Message)
def delete_deposit(deposit_id: int, db: Session = Depends(get_db)):
    """Xóa một yêu cầu nạp (kèm ảnh bill). KHÔNG hoàn/đổi số dư đã cộng."""
    deposit = db.get(DepositRequest, deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu nạp")
    delete_folder(f"deposits/{deposit.deposit_code}")
    db.delete(deposit)
    db.commit()
    return Message(detail="Đã xóa yêu cầu nạp")


@router.get("/purchases", response_model=Page[PurchaseAdminOut])
def list_purchases(
    db: Session = Depends(get_db),
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lịch sử mua acc bằng ví — kèm thông tin người mua (cho Quản lý Acc)."""
    query = (
        db.query(WalletTransaction, Account, User)
        .join(Account, WalletTransaction.ref_id == Account.id)
        .join(User, WalletTransaction.user_id == User.id)
        .filter(
            WalletTransaction.type == "account_purchase",
            WalletTransaction.ref_type == "account",
        )
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Account.account_code.ilike(like),
                User.username.ilike(like),
                User.full_name.ilike(like),
                User.phone.ilike(like),
            )
        )
    total = query.count()
    rows = (
        query.order_by(
            WalletTransaction.created_at.desc(), WalletTransaction.id.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        PurchaseAdminOut(
            account_id=acc.id,
            account_code=acc.account_code,
            amount=float(abs(txn.amount)),
            purchased_at=txn.created_at,
            thumbnail=acc.images[0].image_url if acc.images else None,
            status=acc.status,
            user_id=u.id,
            username=u.username,
            full_name=u.full_name,
            phone=u.phone,
        )
        for txn, acc, u in rows
    ]
    return Page.create(items, total, page, page_size)


@router.get("/transactions", response_model=Page[WalletTransactionAdminOut])
def list_transactions(
    db: Session = Depends(get_db),
    q: str | None = None,
    user_id: int | None = None,
    type: str | None = Query(
        None,
        pattern="^(deposit|order_payment|account_purchase|post_fee|valuation_fee|adjust|refund)$",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Sổ giao dịch ví toàn hệ thống — kèm thông tin người dùng cụ thể."""
    query = db.query(WalletTransaction).join(
        User, WalletTransaction.user_id == User.id
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.full_name.ilike(like),
                User.phone.ilike(like),
                WalletTransaction.note.ilike(like),
            )
        )
    if user_id:
        query = query.filter(WalletTransaction.user_id == user_id)
    if type:
        query = query.filter(WalletTransaction.type == type)
    total = query.count()
    rows = (
        query.order_by(
            WalletTransaction.created_at.desc(), WalletTransaction.id.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for t in rows:
        out = WalletTransactionAdminOut.model_validate(t)
        if t.user:
            out.username = t.user.username
            out.full_name = t.user.full_name
        items.append(out)
    return Page.create(items, total, page, page_size)


@router.delete("/transactions/{txn_id}", response_model=Message)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    """Xóa một dòng sổ giao dịch (chỉ xóa lịch sử, KHÔNG đổi số dư người dùng).

    Lưu ý: xóa dòng ledger sẽ làm lệch đối soát balance_after — chỉ dùng để dọn.
    """
    txn = db.get(WalletTransaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    db.delete(txn)
    db.commit()
    return Message(detail="Đã xóa giao dịch")


@router.post("/users/{user_id}/adjust-balance", response_model=Message)
def adjust_balance(
    user_id: int, payload: BalanceAdjust, db: Session = Depends(get_db)
):
    """Điều chỉnh số dư thủ công (dương = cộng, âm = trừ)."""
    user = wallet_service.lock_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    try:
        wallet_service.adjust(db, user, payload.amount, note=payload.note)
    except wallet_service.InsufficientBalanceError:
        raise HTTPException(status_code=400, detail="Số dư không đủ để trừ")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return Message(detail="Đã điều chỉnh số dư")
