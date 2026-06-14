"""Lõi thay đổi số dư ví — DÙNG CHUNG cho nạp tiền, thanh toán order, điều chỉnh.

Nguyên tắc bảo mật:
- Mọi thay đổi số dư chỉ đi qua đây, luôn ghi một dòng WalletTransaction (audit).
- Caller PHẢI khóa dòng user trước (lock_user) để chống đua lệnh / trừ trùng.
- Caller chịu trách nhiệm commit (các hàm này chỉ flush để có balance_after).
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import User, WalletTransaction


class InsufficientBalanceError(Exception):
    """Số dư không đủ để trừ."""


def lock_user(db: Session, user_id: int) -> User | None:
    """Lấy user và KHÓA DÒNG (SELECT ... FOR UPDATE) để cập nhật số dư an toàn."""
    return (
        db.query(User).filter(User.id == user_id).with_for_update().first()
    )


def _record(
    db: Session,
    user: User,
    delta: Decimal,
    tx_type: str,
    note: str | None,
    ref_type: str | None,
    ref_id: int | None,
) -> WalletTransaction:
    new_balance = Decimal(str(user.balance or 0)) + delta
    user.balance = new_balance
    txn = WalletTransaction(
        user_id=user.id,
        type=tx_type,
        amount=delta,
        balance_after=new_balance,
        ref_type=ref_type,
        ref_id=ref_id,
        note=note,
    )
    db.add(txn)
    db.flush()
    return txn


def credit(
    db: Session,
    user: User,
    amount: float | Decimal,
    tx_type: str,
    note: str | None = None,
    ref_type: str | None = None,
    ref_id: int | None = None,
) -> WalletTransaction:
    """Cộng tiền vào số dư (amount > 0)."""
    delta = Decimal(str(amount))
    if delta <= 0:
        raise ValueError("Số tiền cộng phải lớn hơn 0")
    return _record(db, user, delta, tx_type, note, ref_type, ref_id)


def debit(
    db: Session,
    user: User,
    amount: float | Decimal,
    tx_type: str,
    note: str | None = None,
    ref_type: str | None = None,
    ref_id: int | None = None,
) -> WalletTransaction:
    """Trừ tiền khỏi số dư (amount > 0). Raise nếu không đủ số dư."""
    value = Decimal(str(amount))
    if value <= 0:
        raise ValueError("Số tiền trừ phải lớn hơn 0")
    if Decimal(str(user.balance or 0)) < value:
        raise InsufficientBalanceError()
    return _record(db, user, -value, tx_type, note, ref_type, ref_id)


def adjust(
    db: Session,
    user: User,
    amount: float | Decimal,
    note: str | None = None,
) -> WalletTransaction:
    """Điều chỉnh thủ công (admin): dương = cộng, âm = trừ. Không cho âm số dư."""
    delta = Decimal(str(amount))
    if delta == 0:
        raise ValueError("Số tiền điều chỉnh phải khác 0")
    if delta < 0 and Decimal(str(user.balance or 0)) < -delta:
        raise InsufficientBalanceError()
    return _record(db, user, delta, "adjust", note, "adjust", None)
