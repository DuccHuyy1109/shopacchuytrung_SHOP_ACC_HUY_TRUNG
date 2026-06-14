from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_phone_user
from app.database import get_db
from app.models import Order, OrderFormField
from app.models.user import User
from app.schemas.catalog import ContactInfoOut
from app.schemas.order import (
    OrderCreate,
    OrderCreateResponse,
    OrderFormFieldOut,
    OrderOut,
    OrderPayResponse,
)
from app.services import wallet as wallet_service
from app.services.contacts import get_default_contact
from app.services.notifications import notify_order
from app.services.site import get_setting
from app.utils.codes import gen_order_code

router = APIRouter(prefix="/api", tags=["Order Acc"])


@router.get("/order-form/fields", response_model=list[OrderFormFieldOut])
def get_order_form_fields(db: Session = Depends(get_db)):
    """Các trường của phiếu Order Acc (admin cấu hình)."""
    return (
        db.query(OrderFormField)
        .filter(OrderFormField.is_active == True)
        .order_by(OrderFormField.sort_order, OrderFormField.id)
        .all()
    )


@router.post("/orders", response_model=OrderCreateResponse, status_code=201)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Tạo phiếu Order Acc và sinh mã QR. Thông tin liên hệ lấy từ hồ sơ user."""
    fields = (
        db.query(OrderFormField)
        .filter(OrderFormField.is_active == True)
        .order_by(OrderFormField.sort_order, OrderFormField.id)
        .all()
    )

    # Kiểm tra trường bắt buộc & chụp lại dữ liệu theo nhãn (label).
    def _empty(v) -> bool:
        if v is None:
            return True
        if isinstance(v, str):
            return v.strip() == ""
        if isinstance(v, list):
            return len(v) == 0
        return False

    snapshot: dict[str, object] = {}
    for field in fields:
        value = payload.form_data.get(field.field_key)
        if field.is_required and _empty(value):
            raise HTTPException(
                status_code=400, detail=f"Vui lòng điền: {field.label}"
            )
        if not _empty(value):
            snapshot[field.label] = value

    # Giá (phí) order lấy từ cấu hình site — sẽ trừ thẳng vào số dư ví ở bước 2.
    try:
        price = float(get_setting(db, "order_deposit_amount", "50000"))
    except (TypeError, ValueError):
        price = 50000.0

    # Sinh mã phiếu duy nhất.
    order_code = gen_order_code()
    while db.query(Order).filter(Order.order_code == order_code).first():
        order_code = gen_order_code()

    order = Order(
        order_code=order_code,
        user_id=current_user.id,
        # Liên hệ lấy tự động từ hồ sơ người dùng.
        customer_name=current_user.full_name or current_user.username,
        customer_phone=current_user.phone or "",
        customer_email=current_user.email,
        form_data=snapshot,
        amount=price,
        status="pending",
        payment_status="unpaid",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    return OrderCreateResponse(
        order=OrderOut.model_validate(order),
        amount=price,
        balance=float(current_user.balance or 0),
    )


@router.get("/orders/me/list", response_model=list[OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách phiếu order của chính tôi (để theo dõi trạng thái)."""
    return (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/orders/{order_code}", response_model=OrderOut)
def get_order(
    order_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tra cứu phiếu order theo mã — chỉ chủ đơn (hoặc admin) mới xem được.

    (Tránh lộ thông tin khách: mã đơn dễ đoán nên bắt buộc kiểm tra quyền.)
    """
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    if order.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    return order


@router.post("/orders/{order_code}/pay", response_model=OrderPayResponse)
def pay_order(
    order_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Thanh toán phí order BẰNG SỐ DƯ ví (trừ thẳng vào tài khoản)."""
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    if order.payment_status == "confirmed":
        raise HTTPException(status_code=400, detail="Đơn này đã được thanh toán")

    price = float(order.amount or 0)

    # Khóa dòng user để chống trừ trùng / đua lệnh.
    user = wallet_service.lock_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    try:
        wallet_service.debit(
            db,
            user,
            price,
            tx_type="order_payment",
            note=f"Thanh toán order {order.order_code}",
            ref_type="order",
            ref_id=order.id,
        )
    except wallet_service.InsufficientBalanceError:
        raise HTTPException(
            status_code=400,
            detail="Số dư không đủ. Vui lòng nạp thêm tiền để thanh toán.",
        )

    order.payment_status = "confirmed"
    order.status = "processing"
    db.commit()
    db.refresh(order)
    db.refresh(user)
    notify_order(order.id)

    contact = get_default_contact(db)
    if not contact:
        raise HTTPException(
            status_code=503, detail="Shop chưa cấu hình thông tin liên hệ"
        )
    return OrderPayResponse(
        order=OrderOut.model_validate(order),
        balance=float(user.balance or 0),
        contact=ContactInfoOut(
            name=contact.name,
            zalo_link=contact.zalo_link,
            facebook_link=contact.facebook_link,
            phone=contact.phone,
        ),
        message=(
            "Thanh toán thành công! Yêu cầu order đã được gửi tới shop. "
            "Admin sẽ tìm acc phù hợp và liên hệ lại với bạn."
        ),
    )
