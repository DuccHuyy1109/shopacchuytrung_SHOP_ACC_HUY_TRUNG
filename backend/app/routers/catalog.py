from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_phone_user
from app.database import get_db
from app.models import Account, AccountContact, DescriptionTag, PriceCategory, Shop
from app.models.user import User
from app.schemas.catalog import (
    AccountBuyResponse,
    AccountListItem,
    AccountPublicOut,
    ContactInfoOut,
    DescriptionTagOut,
    PriceCategoryOut,
    ShopOut,
)
from app.schemas.common import Page
from app.services import wallet as wallet_service
from app.services.contacts import get_contact_for_account
from app.services.notifications import (
    notify_account_contact,
    notify_account_purchase,
)
from app.services.site import get_setting

router = APIRouter(prefix="/api", tags=["Danh mục & Acc"])

_SORT_OPTIONS = {
    "newest": Account.created_at.desc(),
    "oldest": Account.created_at.asc(),
    "price_asc": Account.sale_price.asc(),
    "price_desc": Account.sale_price.desc(),
    "vip_desc": Account.vip_level.desc(),
}


@router.get("/categories", response_model=list[PriceCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    """Danh mục acc theo giá (dưới 1tr, 1-2tr, ...)."""
    return (
        db.query(PriceCategory)
        .filter(PriceCategory.is_active == True)
        .order_by(PriceCategory.sort_order, PriceCategory.id)
        .all()
    )


@router.get("/description-tags", response_model=list[DescriptionTagOut])
def list_description_tags(db: Session = Depends(get_db)):
    """Danh sách mẫu mô tả (dùng gợi ý cho 'Kiểu acc' khi order)."""
    return (
        db.query(DescriptionTag)
        .order_by(DescriptionTag.sort_order, DescriptionTag.id)
        .all()
    )


@router.get("/shops", response_model=list[ShopOut])
def list_shops(db: Session = Depends(get_db)):
    return (
        db.query(Shop)
        .filter(Shop.is_active == True)
        .order_by(Shop.name)
        .all()
    )


@router.get("/accounts", response_model=Page[AccountListItem])
def list_accounts(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Từ khóa tìm kiếm"),
    category_type: str | None = Query(None, description="acc_co | sieu_pham | acc_thuong"),
    price_category_id: int | None = None,
    shop_id: int | None = None,
    vip_min: int | None = Query(None, ge=0, le=8),
    vip_max: int | None = Query(None, ge=0, le=8),
    price_min: float | None = Query(None, ge=0),
    price_max: float | None = Query(None, ge=0),
    desc_any: str | None = Query(
        None, description="Lọc acc có mô tả chứa 1 trong các từ (phân cách dấu phẩy)"
    ),
    is_featured: bool | None = None,
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    """Danh sách acc đang bán — hỗ trợ tìm kiếm, lọc và phân trang."""
    query = db.query(Account).filter(Account.status == "available")

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Account.account_code.ilike(like),
                Account.description.ilike(like),
            )
        )
    if category_type:
        query = query.filter(Account.category_type == category_type)
    if price_category_id:
        query = query.filter(Account.price_category_id == price_category_id)
    if shop_id:
        query = query.filter(Account.shop_id == shop_id)
    if vip_min is not None:
        query = query.filter(Account.vip_level >= vip_min)
    if vip_max is not None:
        query = query.filter(Account.vip_level <= vip_max)
    if price_min is not None:
        query = query.filter(Account.sale_price >= price_min)
    if price_max is not None:
        query = query.filter(Account.sale_price <= price_max)
    if desc_any:
        terms = [t.strip() for t in desc_any.split(",") if t.strip()]
        if terms:
            query = query.filter(
                or_(*[Account.description.ilike(f"%{t}%") for t in terms])
            )
    if is_featured is not None:
        query = query.filter(Account.is_featured == is_featured)

    total = query.count()
    order_by = _SORT_OPTIONS.get(sort, Account.created_at.desc())
    accounts = (
        query.options(selectinload(Account.images))
        .order_by(order_by)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items: list[AccountListItem] = []
    for acc in accounts:
        item = AccountListItem.model_validate(acc)
        item.thumbnail = acc.images[0].image_url if acc.images else None
        items.append(item)
    return Page.create(items, total, page, page_size)


@router.get("/accounts/by-code/{code}", response_model=AccountPublicOut)
def get_account_by_code(code: str, db: Session = Depends(get_db)):
    """Lấy chi tiết acc theo mã (vd '#769865' hoặc '769865') — dùng cho so sánh."""
    norm = code.strip().lstrip("#")
    account = (
        db.query(Account)
        .options(
            selectinload(Account.images),
            selectinload(Account.price_category),
            selectinload(Account.contact),
        )
        .filter(
            or_(
                Account.account_code.ilike(norm),
                Account.account_code.ilike(f"#{norm}"),
            ),
            Account.status != "hidden",
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy acc với mã này")
    return account


@router.get("/accounts/{account_id}", response_model=AccountPublicOut)
def get_account(account_id: int, db: Session = Depends(get_db)):
    """Chi tiết một acc. Không lộ thông tin shop.

    LƯU Ý: GET không tăng lượt xem (tránh đếm trùng khi prefetch/refetch/
    React StrictMode). Lượt xem được ghi nhận qua POST .../view bên dưới.
    """
    account = (
        db.query(Account)
        .options(
            selectinload(Account.images),
            selectinload(Account.price_category),
            selectinload(Account.contact),
        )
        .filter(Account.id == account_id)
        .first()
    )
    if not account or account.status == "hidden":
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    return account


@router.post("/accounts/{account_id}/view")
def track_account_view(account_id: int, db: Session = Depends(get_db)):
    """Ghi nhận đúng 1 lượt xem acc — tách khỏi GET để mỗi lần mở chỉ +1.

    Client gọi 1 lần khi mở trang chi tiết (có khóa chống gọi trùng)."""
    account = db.get(Account, account_id)
    if not account or account.status == "hidden":
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    account.view_count = (account.view_count or 0) + 1
    db.commit()
    return {"view_count": account.view_count}


@router.post(
    "/accounts/{account_id}/contact", response_model=ContactInfoOut
)
def contact_to_buy(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Người dùng nhấn 'Liên hệ mua' — hệ thống tự lấy tên & SĐT của họ,
    ghi nhận vào hệ thống admin, báo Telegram và trả link Zalo/FB."""
    account = db.get(Account, account_id)
    if not account or account.status == "hidden":
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")

    record = AccountContact(
        account_id=account_id,
        user_id=current_user.id,
        customer_name=current_user.full_name or current_user.username,
        customer_phone=current_user.phone,
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    notify_account_contact(record.id)

    contact = get_contact_for_account(db, account)
    if not contact:
        raise HTTPException(
            status_code=503,
            detail="Shop chưa cấu hình thông tin liên hệ, vui lòng thử lại sau",
        )
    return ContactInfoOut(
        name=contact.name,
        zalo_link=contact.zalo_link,
        facebook_link=contact.facebook_link,
        phone=contact.phone,
    )


@router.post("/accounts/{account_id}/buy", response_model=AccountBuyResponse)
def buy_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Mua acc trực tiếp BẰNG SỐ DƯ VÍ — trừ tiền và giữ acc (đánh dấu đã bán).

    Chức năng có thể bật/tắt qua cấu hình site `buy_account_enabled`.
    """
    # Mặc định TẮT — chỉ cho mua khi admin bật rõ ràng trong cấu hình site.
    if (get_setting(db, "buy_account_enabled", "0") or "0") != "1":
        raise HTTPException(
            status_code=403, detail="Chức năng mua acc trực tiếp đang tạm tắt"
        )

    # Khóa dòng acc: 2 người bấm mua cùng lúc thì chỉ 1 người mua được.
    account = (
        db.query(Account)
        .filter(Account.id == account_id)
        .with_for_update()
        .first()
    )
    if not account or account.status == "hidden":
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    if account.status != "available":
        raise HTTPException(status_code=400, detail="Acc này đã được bán")
    price = float(account.sale_price or 0)
    if price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Acc này chưa có giá bán, vui lòng liên hệ shop",
        )

    # Khóa dòng user để chống trừ trùng / đua lệnh khi 2 người cùng mua.
    user = wallet_service.lock_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    try:
        wallet_service.debit(
            db,
            user,
            price,
            tx_type="account_purchase",
            note=f"Mua acc {account.account_code}",
            ref_type="account",
            ref_id=account.id,
        )
    except wallet_service.InsufficientBalanceError:
        raise HTTPException(
            status_code=400,
            detail="Số dư không đủ để mua acc này. Vui lòng nạp thêm tiền.",
        )

    # Giữ acc cho khách: đánh dấu đã bán để không ai mua trùng.
    account.status = "sold"
    db.commit()
    db.refresh(user)
    notify_account_purchase(account.id, user.id, price)

    contact = get_contact_for_account(db, account)
    if not contact:
        raise HTTPException(
            status_code=503,
            detail="Shop chưa cấu hình thông tin liên hệ, vui lòng thử lại sau",
        )
    return AccountBuyResponse(
        account_code=account.account_code,
        balance=float(user.balance or 0),
        contact=ContactInfoOut(
            name=contact.name,
            zalo_link=contact.zalo_link,
            facebook_link=contact.facebook_link,
            phone=contact.phone,
        ),
        message=(
            "Thanh toán thành công! Acc đã được giữ cho bạn — vui lòng liên hệ "
            "shop qua Zalo/Facebook để nhận acc."
        ),
    )
