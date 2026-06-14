from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models import Order, OrderFormField
from app.schemas.common import Message, Page
from app.services.storage import delete_folder
from app.schemas.order import (
    OrderAdminOut,
    OrderFormFieldCreate,
    OrderFormFieldOut,
    OrderFormFieldUpdate,
    OrderUpdate,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Order Acc"],
    dependencies=[Depends(require_admin)],
)


# ==================== ORDER FORM FIELDS ====================
@router.get("/order-form/fields", response_model=list[OrderFormFieldOut])
def list_form_fields(db: Session = Depends(get_db)):
    """Toàn bộ trường form Order (kể cả đã ẩn)."""
    return (
        db.query(OrderFormField)
        .order_by(OrderFormField.sort_order, OrderFormField.id)
        .all()
    )


@router.post("/order-form/fields", response_model=OrderFormFieldOut, status_code=201)
def create_form_field(
    payload: OrderFormFieldCreate, db: Session = Depends(get_db)
):
    if (
        db.query(OrderFormField)
        .filter(OrderFormField.field_key == payload.field_key)
        .first()
    ):
        raise HTTPException(status_code=409, detail="field_key đã tồn tại")
    field = OrderFormField(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/order-form/fields/{field_id}", response_model=OrderFormFieldOut)
def update_form_field(
    field_id: int,
    payload: OrderFormFieldUpdate,
    db: Session = Depends(get_db),
):
    field = db.get(OrderFormField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Không tìm thấy trường")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/order-form/fields/{field_id}", response_model=Message)
def delete_form_field(field_id: int, db: Session = Depends(get_db)):
    field = db.get(OrderFormField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Không tìm thấy trường")
    db.delete(field)
    db.commit()
    return Message(detail="Đã xóa trường form")


# ==================== ORDERS ====================
@router.get("/orders", response_model=Page[OrderAdminOut])
def list_orders(
    db: Session = Depends(get_db),
    q: str | None = None,
    status: str | None = Query(
        None, pattern="^(pending|paid|processing|completed|cancelled)$"
    ),
    payment_status: str | None = Query(
        None, pattern="^(unpaid|pending_confirm|confirmed)$"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách phiếu order."""
    query = db.query(Order)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Order.order_code.ilike(like),
                Order.customer_name.ilike(like),
                Order.customer_phone.ilike(like),
            )
        )
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    total = query.count()
    orders = (
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [OrderAdminOut.model_validate(o) for o in orders], total, page, page_size
    )


@router.get("/orders/{order_id}", response_model=OrderAdminOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    return order


@router.put("/orders/{order_id}", response_model=OrderAdminOut)
def update_order(
    order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, key, value)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/orders/{order_id}", response_model=Message)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu order")
    # Xóa thư mục ảnh bill của đơn khỏi storage.
    delete_folder(f"orders/{order.order_code}")
    db.delete(order)
    db.commit()
    return Message(detail="Đã xóa phiếu order")
