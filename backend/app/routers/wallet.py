from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Account, DepositRequest, PaymentSetting, WalletTransaction
from app.models.user import User
from app.schemas.catalog import ContactInfoOut
from app.schemas.order import BankInfo
from app.schemas.wallet import (
    DepositConfirmResponse,
    DepositOut,
    DepositPrepare,
    DepositPrepareResponse,
    DepositSubmit,
    FeePayResponse,
    PurchasedAccountOut,
    WalletMeOut,
    WalletTransactionOut,
)
from app.services import wallet as wallet_service
from app.services.contacts import get_contact_for_account
from app.services.notifications import notify_deposit
from app.services.payment import build_vietqr_url
from app.services.site import get_setting
from app.utils.codes import gen_deposit_code, make_deposit_transfer

router = APIRouter(prefix="/api", tags=["Ví / Nạp tiền"])


@router.get("/wallet/me", response_model=WalletMeOut)
def my_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Số dư + sổ biến động số dư của tôi (mới nhất trước)."""
    txns = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
        .limit(100)
        .all()
    )
    return WalletMeOut(
        balance=float(current_user.balance or 0),
        transactions=[WalletTransactionOut.model_validate(t) for t in txns],
    )


@router.post("/valuation/pay", response_model=FeePayResponse)
def pay_valuation_fee(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thu phí định giá acc (cấu hình site) — phí 0 thì miễn phí, không trừ."""
    try:
        fee = float(get_setting(db, "valuation_fee_amount", "0") or 0)
    except (TypeError, ValueError):
        fee = 0.0
    if fee <= 0:
        return FeePayResponse(
            fee=0, balance=float(current_user.balance or 0), paid=False
        )

    user = wallet_service.lock_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    try:
        wallet_service.debit(
            db,
            user,
            fee,
            tx_type="valuation_fee",
            note="Phí định giá acc",
            ref_type="valuation",
            ref_id=None,
        )
    except wallet_service.InsufficientBalanceError:
        raise HTTPException(
            status_code=400,
            detail="Số dư không đủ để thanh toán phí định giá. "
            "Vui lòng nạp thêm tiền.",
        )
    db.commit()
    db.refresh(user)
    return FeePayResponse(fee=fee, balance=float(user.balance or 0), paid=True)


@router.get("/purchases/me", response_model=list[PurchasedAccountOut])
def my_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách acc tôi đã mua bằng số dư ví (mới nhất trước)."""
    rows = (
        db.query(WalletTransaction, Account)
        .join(Account, WalletTransaction.ref_id == Account.id)
        .filter(
            WalletTransaction.user_id == current_user.id,
            WalletTransaction.type == "account_purchase",
            WalletTransaction.ref_type == "account",
        )
        .order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
        .all()
    )
    items: list[PurchasedAccountOut] = []
    for txn, acc in rows:
        # Liên hệ nhận acc: lấy theo liên hệ gắn với acc (fallback mặc định).
        c = get_contact_for_account(db, acc)
        items.append(
            PurchasedAccountOut(
                account_id=acc.id,
                account_code=acc.account_code,
                amount=float(abs(txn.amount)),
                purchased_at=txn.created_at,
                thumbnail=acc.images[0].image_url if acc.images else None,
                status=acc.status,
                contact=ContactInfoOut(
                    name=c.name,
                    zalo_link=c.zalo_link,
                    facebook_link=c.facebook_link,
                    phone=c.phone,
                )
                if c
                else None,
            )
        )
    return items


@router.get("/deposits/me", response_model=list[DepositOut])
def my_deposits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lịch sử yêu cầu nạp tiền của tôi."""
    return (
        db.query(DepositRequest)
        .filter(DepositRequest.user_id == current_user.id)
        .order_by(DepositRequest.created_at.desc())
        .all()
    )


@router.post("/deposits/prepare", response_model=DepositPrepareResponse)
def prepare_deposit(
    payload: DepositPrepare,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bước 1: sinh QR + nội dung chuyển khoản NAPTIEN<TÊN><MÃ>.

    KHÔNG lưu DB — bấm 'Tiếp tục chuyển khoản' nhiều lần sẽ không tạo ra hàng
    loạt yêu cầu rác làm loạn danh sách admin. Yêu cầu nạp chỉ được ghi nhận
    khi khách bấm 'Tôi đã chuyển khoản' kèm ảnh bill (xem submit_deposit).
    """
    try:
        min_amount = float(get_setting(db, "min_deposit_amount", "10000"))
    except (TypeError, ValueError):
        min_amount = 10000.0
    if payload.amount < min_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Số tiền nạp tối thiểu là {int(min_amount):,}đ".replace(",", "."),
        )

    payment = (
        db.query(PaymentSetting)
        .filter(PaymentSetting.is_active == True)
        .order_by(PaymentSetting.id)
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=503, detail="Shop chưa cấu hình tài khoản thanh toán"
        )

    # Sinh nội dung CK & mã yêu cầu duy nhất (chưa lưu DB).
    account_name = current_user.full_name or current_user.username
    transfer_content, _code = make_deposit_transfer(account_name)
    while (
        db.query(DepositRequest)
        .filter(DepositRequest.transfer_content == transfer_content)
        .first()
    ):
        transfer_content, _code = make_deposit_transfer(account_name)

    deposit_code = gen_deposit_code()
    while (
        db.query(DepositRequest)
        .filter(DepositRequest.deposit_code == deposit_code)
        .first()
    ):
        deposit_code = gen_deposit_code()

    qr_url = build_vietqr_url(
        bank_code=payment.bank_code,
        account_number=payment.account_number,
        account_name=payment.account_name,
        amount=payload.amount,
        description=transfer_content,
        template=payment.template or "compact2",
    )
    return DepositPrepareResponse(
        deposit_code=deposit_code,
        amount=float(payload.amount),
        transfer_content=transfer_content,
        qr_url=qr_url,
        bank=BankInfo(
            bank_code=payment.bank_code,
            bank_name=payment.bank_name,
            account_number=payment.account_number,
            account_name=payment.account_name,
        ),
    )


@router.post("/deposits", response_model=DepositConfirmResponse, status_code=201)
def submit_deposit(
    payload: DepositSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bước 2: khách báo đã chuyển khoản (kèm ảnh bill) -> TẠO yêu cầu nạp &
    gửi thông báo Telegram cho admin.

    Đây là thời điểm DUY NHẤT yêu cầu nạp được ghi vào DB và đến tay admin.
    """
    if not payload.bill_images:
        raise HTTPException(
            status_code=400, detail="Vui lòng đính kèm ảnh bill chuyển khoản"
        )
    try:
        min_amount = float(get_setting(db, "min_deposit_amount", "10000"))
    except (TypeError, ValueError):
        min_amount = 10000.0
    if payload.amount < min_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Số tiền nạp tối thiểu là {int(min_amount):,}đ".replace(",", "."),
        )

    # Nội dung CK giữ đúng mã QR khách đã quét; mã yêu cầu bảo đảm duy nhất.
    transfer_content = (payload.transfer_content or "").strip()[:120]
    if not transfer_content:
        transfer_content, _ = make_deposit_transfer(
            current_user.full_name or current_user.username
        )
    deposit_code = (payload.deposit_code or "").strip()[:30] or gen_deposit_code()
    while (
        db.query(DepositRequest)
        .filter(DepositRequest.deposit_code == deposit_code)
        .first()
    ):
        deposit_code = gen_deposit_code()

    deposit = DepositRequest(
        deposit_code=deposit_code,
        user_id=current_user.id,
        amount=payload.amount,
        transfer_content=transfer_content,
        bill_images=payload.bill_images,
        status="pending",
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    notify_deposit(deposit.id)

    return DepositConfirmResponse(
        deposit=DepositOut.model_validate(deposit),
        message=(
            "Đã gửi yêu cầu nạp tiền tới shop. Vui lòng chờ admin xác nhận, "
            "số dư sẽ được cộng ngay sau khi đối soát chuyển khoản."
        ),
    )
