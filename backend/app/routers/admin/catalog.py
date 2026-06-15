from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_admin
from app.database import get_db
from app.models import (
    Account,
    AccountContact,
    AccountImage,
    DescriptionTag,
    PriceCategory,
    Shop,
)
from app.schemas.catalog import (
    AccountCreate,
    AccountListItem,
    AccountOut,
    AccountUpdate,
    DescriptionTagCreate,
    DescriptionTagOut,
    DescriptionTagUpdate,
    PriceCategoryCreate,
    PriceCategoryOut,
    PriceCategoryUpdate,
    ShopCreate,
    ShopOut,
    ShopUpdate,
)
from app.schemas.common import Message, Page
from app.services.storage import delete_folder, delete_image
from app.utils.codes import gen_account_code, slugify

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Danh mục & Acc"],
    dependencies=[Depends(require_admin)],
)


def _unique_category_slug(db: Session, name: str, exclude_id: int | None = None) -> str:
    base = slugify(name)
    slug, n = base, 1
    while True:
        q = db.query(PriceCategory).filter(PriceCategory.slug == slug)
        if exclude_id:
            q = q.filter(PriceCategory.id != exclude_id)
        if not q.first():
            return slug
        n += 1
        slug = f"{base}-{n}"


# ==================== PRICE CATEGORIES ====================
@router.get("/categories", response_model=list[PriceCategoryOut])
def admin_list_categories(db: Session = Depends(get_db)):
    return (
        db.query(PriceCategory)
        .order_by(PriceCategory.sort_order, PriceCategory.id)
        .all()
    )


@router.post("/categories", response_model=PriceCategoryOut, status_code=201)
def create_category(payload: PriceCategoryCreate, db: Session = Depends(get_db)):
    category = PriceCategory(
        slug=_unique_category_slug(db, payload.name),
        **payload.model_dump(),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=PriceCategoryOut)
def update_category(
    category_id: int,
    payload: PriceCategoryUpdate,
    db: Session = Depends(get_db),
):
    category = db.get(PriceCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        category.slug = _unique_category_slug(db, data["name"], exclude_id=category_id)
    for field, value in data.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", response_model=Message)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(PriceCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    db.query(Account).filter(Account.price_category_id == category_id).update(
        {Account.price_category_id: None}
    )
    db.delete(category)
    db.commit()
    return Message(detail="Đã xóa danh mục")


# ==================== SHOPS ====================
@router.get("/shops", response_model=list[ShopOut])
def admin_list_shops(db: Session = Depends(get_db)):
    return db.query(Shop).order_by(Shop.name).all()


@router.post("/shops", response_model=ShopOut, status_code=201)
def create_shop(payload: ShopCreate, db: Session = Depends(get_db)):
    shop = Shop(**payload.model_dump())
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


@router.put("/shops/{shop_id}", response_model=ShopOut)
def update_shop(shop_id: int, payload: ShopUpdate, db: Session = Depends(get_db)):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Không tìm thấy shop")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shop, field, value)
    db.commit()
    db.refresh(shop)
    return shop


@router.delete("/shops/{shop_id}", response_model=Message)
def delete_shop(shop_id: int, db: Session = Depends(get_db)):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Không tìm thấy shop")
    db.query(Account).filter(Account.shop_id == shop_id).update(
        {Account.shop_id: None}
    )
    db.delete(shop)
    db.commit()
    return Message(detail="Đã xóa shop")


# ==================== DESCRIPTION TAGS (mẫu mô tả acc) ====================
@router.get("/description-tags", response_model=list[DescriptionTagOut])
def list_description_tags(db: Session = Depends(get_db)):
    return (
        db.query(DescriptionTag)
        .order_by(DescriptionTag.sort_order, DescriptionTag.id)
        .all()
    )


@router.post("/description-tags", response_model=DescriptionTagOut, status_code=201)
def create_description_tag(
    payload: DescriptionTagCreate, db: Session = Depends(get_db)
):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Nội dung mô tả không được để trống")
    # Đã có (text là duy nhất toàn cục) -> trả về luôn, tránh trùng.
    existing = db.query(DescriptionTag).filter(DescriptionTag.text == text).first()
    if existing:
        if payload.gia_tien:
            existing.gia_tien = payload.gia_tien
            db.commit()
            db.refresh(existing)
        return existing
    tag = DescriptionTag(
        text=text,
        gia_tien=payload.gia_tien,
        sort_order=payload.sort_order,
        tag_type=payload.tag_type,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/description-tags/{tag_id}", response_model=DescriptionTagOut)
def update_description_tag(
    tag_id: int, payload: DescriptionTagUpdate, db: Session = Depends(get_db)
):
    tag = db.get(DescriptionTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu mô tả")
    data = payload.model_dump(exclude_unset=True)
    if data.get("text") is not None:
        data["text"] = data["text"].strip()
    for field, value in data.items():
        setattr(tag, field, value)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/description-tags/{tag_id}", response_model=Message)
def delete_description_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(DescriptionTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu mô tả")
    db.delete(tag)
    db.commit()
    return Message(detail="Đã xóa mẫu mô tả")


# ==================== ACCOUNTS ====================
MAX_ACCOUNT_IMAGES = 25


def _check_image_limit(image_urls: list[str] | None) -> None:
    if image_urls and len(image_urls) > MAX_ACCOUNT_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Mỗi acc chỉ được tối đa {MAX_ACCOUNT_IMAGES} ảnh.",
        )


def _set_account_images(db: Session, account: Account, image_urls: list[str]) -> None:
    account.images.clear()
    db.flush()
    for i, url in enumerate(image_urls):
        db.add(AccountImage(account_id=account.id, image_url=url, sort_order=i))


def _resolve_price_category(db: Session, sale_price: float) -> int | None:
    """Tự xếp acc vào danh mục giá dựa theo giá bán."""
    categories = (
        db.query(PriceCategory)
        .filter(PriceCategory.is_active == True)
        .order_by(PriceCategory.sort_order, PriceCategory.id)
        .all()
    )
    for c in categories:
        low = float(c.min_price) if c.min_price is not None else 0.0
        high = float(c.max_price) if c.max_price is not None else None
        if sale_price >= low and (high is None or sale_price <= high):
            return c.id
    return None


def _unique_account_code(db: Session) -> str:
    code = gen_account_code()
    while db.query(Account).filter(Account.account_code == code).first():
        code = gen_account_code()
    return code


@router.get("/accounts", response_model=Page[AccountListItem])
def admin_list_accounts(
    db: Session = Depends(get_db),
    q: str | None = None,
    status: str | None = Query(None, pattern="^(available|sold|hidden)$"),
    category_type: str | None = None,
    vip_level: int | None = Query(None, ge=1, le=8),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Danh sách acc cho admin (bao gồm cả acc ẩn / đã bán)."""
    query = db.query(Account)
    if q:
        term = q.strip()
        like = f"%{term}%"
        conditions = [
            Account.account_code.ilike(like),
            Account.description.ilike(like),
            Account.category_type.ilike(like),
        ]
        if term.isdigit():
            conditions.append(Account.id == int(term))
            conditions.append(Account.vip_level == int(term))
        query = query.filter(or_(*conditions))
    if status:
        query = query.filter(Account.status == status)
    if category_type:
        query = query.filter(Account.category_type == category_type)
    if vip_level is not None:
        query = query.filter(Account.vip_level == vip_level)
    if min_price is not None:
        query = query.filter(Account.sale_price >= min_price)
    if max_price is not None:
        query = query.filter(Account.sale_price <= max_price)
    total = query.count()
    accounts = (
        query.options(selectinload(Account.images))
        .order_by(Account.created_at.desc())
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


@router.get("/accounts/next-code")
def next_account_code(db: Session = Depends(get_db)):
    """Sinh trước một mã acc (chưa lưu) để client gom ảnh theo thư mục."""
    return {"account_code": _unique_account_code(db)}


@router.get("/accounts/{account_id}", response_model=AccountOut)
def admin_get_account(account_id: int, db: Session = Depends(get_db)):
    account = (
        db.query(Account)
        .options(
            selectinload(Account.images),
            selectinload(Account.price_category),
            selectinload(Account.shop),
            selectinload(Account.contact),
        )
        .filter(Account.id == account_id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    return account


@router.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    """Tạo acc — danh mục giá tự xếp theo giá bán.

    Dùng mã acc client đặt sẵn (nếu hợp lệ và chưa trùng) để khớp với thư mục
    ảnh đã upload; ngược lại tự sinh mã mới.
    """
    data = payload.model_dump()
    image_urls = data.pop("image_urls", [])
    _check_image_limit(image_urls)
    code = (data.pop("account_code", None) or "").strip()
    if not code or db.query(Account).filter(Account.account_code == code).first():
        code = _unique_account_code(db)
    account = Account(
        account_code=code,
        price_category_id=_resolve_price_category(db, data["sale_price"]),
        **data,
    )
    db.add(account)
    db.flush()
    for i, url in enumerate(image_urls):
        db.add(AccountImage(account_id=account.id, image_url=url, sort_order=i))
    db.commit()
    db.refresh(account)
    return account


@router.put("/accounts/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    data = payload.model_dump(exclude_unset=True)
    image_urls = data.pop("image_urls", None)
    _check_image_limit(image_urls)
    for field, value in data.items():
        setattr(account, field, value)
    # Luôn xếp lại danh mục giá theo giá bán hiện tại.
    account.price_category_id = _resolve_price_category(
        db, float(account.sale_price)
    )
    if image_urls is not None:
        # Xóa khỏi storage các ảnh đã bị gỡ khi sửa acc.
        for url in [img.image_url for img in account.images if img.image_url not in image_urls]:
            delete_image(url)
        _set_account_images(db, account, image_urls)
    db.commit()
    db.refresh(account)
    return account


def _delete_account(db: Session, account: Account) -> None:
    """Xóa acc + dọn mọi thứ liên quan (liên hệ mua) + ảnh trong kho.

    account_contacts có FK tới accounts nhưng KHÔNG cascade nên phải xóa tay,
    nếu không acc đã từng có người 'Liên hệ mua' sẽ không xóa được (lỗi FK).
    """
    # Xóa ảnh khỏi storage: từng ảnh (gồm ảnh cũ lưu ở gốc) + cả thư mục của acc.
    for img in account.images:
        delete_image(img.image_url)
    delete_folder(account.account_code)
    # Dọn toàn bộ liên hệ mua trỏ tới acc này.
    db.query(AccountContact).filter(
        AccountContact.account_id == account.id
    ).delete(synchronize_session=False)
    db.delete(account)


@router.delete("/accounts/{account_id}", response_model=Message)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy acc")
    _delete_account(db, account)
    db.commit()
    return Message(detail="Đã xóa acc")
