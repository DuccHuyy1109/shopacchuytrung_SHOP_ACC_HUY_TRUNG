from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_phone_user
from app.database import get_db
from app.models import Post, PostContact, PostImage
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.post import (
    PostContactResponse,
    PostCreate,
    PostMineOut,
    PostOut,
    PostUpdate,
)
from app.schemas.catalog import ContactInfoOut
from app.services import wallet as wallet_service
from app.services.contacts import get_default_contact
from app.services.notifications import notify_post_contact
from app.services.site import get_setting
from app.services.storage import delete_folder_by_url, delete_image

router = APIRouter(prefix="/api/posts", tags=["Bài đăng"])

MAX_POST_IMAGES = 5


def _check_post_image_limit(image_urls: list[str] | None) -> None:
    if image_urls and len(image_urls) > MAX_POST_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Mỗi bài đăng chỉ được tối đa {MAX_POST_IMAGES} ảnh.",
        )


def _replace_images(db: Session, post: Post, image_urls: list[str]) -> None:
    post.images.clear()
    db.flush()
    for i, url in enumerate(image_urls):
        db.add(PostImage(post_id=post.id, image_url=url, sort_order=i))


@router.post("", response_model=PostMineOut, status_code=201)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Đăng bài cần mua / cần bán (cần đăng nhập + SĐT). Bài chờ admin duyệt."""
    # Chống spam: giới hạn số bài đang chờ duyệt mỗi người.
    pending = (
        db.query(Post)
        .filter(Post.user_id == current_user.id, Post.status == "pending")
        .count()
    )
    if pending >= 5:
        raise HTTPException(
            status_code=400,
            detail=f"Bạn đang có {pending} bài chờ duyệt. Vui lòng đợi admin "
            "duyệt bớt trước khi đăng thêm.",
        )
    _check_post_image_limit(payload.image_urls)

    post = Post(
        user_id=current_user.id,
        post_type=payload.post_type,
        title=payload.title,
        caption=payload.caption,
        price=payload.price,
        status="pending",
    )
    db.add(post)
    db.flush()

    # Phí đăng bài (cấu hình site) — trừ vào số dư ví; 0 là miễn phí.
    try:
        fee = float(get_setting(db, "post_fee_amount", "0") or 0)
    except (TypeError, ValueError):
        fee = 0.0
    if fee > 0:
        user = wallet_service.lock_user(db, current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        try:
            wallet_service.debit(
                db,
                user,
                fee,
                tx_type="post_fee",
                note=f"Phí đăng bài #{post.id}",
                ref_type="post",
                ref_id=post.id,
            )
        except wallet_service.InsufficientBalanceError:
            raise HTTPException(
                status_code=400,
                detail="Số dư không đủ để thanh toán phí đăng bài. "
                "Vui lòng nạp thêm tiền.",
            )

    for i, url in enumerate(payload.image_urls):
        db.add(PostImage(post_id=post.id, image_url=url, sort_order=i))
    db.commit()
    db.refresh(post)
    return post


@router.get("", response_model=Page[PostOut])
def list_posts(
    db: Session = Depends(get_db),
    post_type: str | None = Query(None, pattern="^(buy|sell)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    """Danh sách bài đăng đã duyệt — danh tính người đăng được ẩn.

    Bài được ghim (is_pinned) luôn hiển thị trước.
    """
    query = db.query(Post).filter(Post.status == "approved")
    if post_type:
        query = query.filter(Post.post_type == post_type)
    total = query.count()
    posts = (
        query.options(selectinload(Post.images))
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [PostOut.model_validate(p) for p in posts], total, page, page_size
    )


@router.get("/me/list", response_model=list[PostMineOut])
def my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách bài đăng của chính tôi."""
    return (
        db.query(Post)
        .options(selectinload(Post.images))
        .filter(Post.user_id == current_user.id)
        .order_by(Post.created_at.desc())
        .all()
    )


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Chi tiết bài đăng đã duyệt (ẩn người đăng)."""
    post = (
        db.query(Post)
        .options(selectinload(Post.images))
        .filter(Post.id == post_id)
        .first()
    )
    if not post or post.status != "approved":
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    return post


@router.put("/{post_id}", response_model=PostMineOut)
def update_post(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sửa bài đăng của chính mình — bài sẽ chờ duyệt lại."""
    post = db.get(Post, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")

    data = payload.model_dump(exclude_unset=True)
    image_urls = data.pop("image_urls", None)
    _check_post_image_limit(image_urls)
    for field, value in data.items():
        setattr(post, field, value)
    if image_urls is not None:
        # Xóa khỏi storage các ảnh đã bị gỡ.
        for url in [i.image_url for i in post.images if i.image_url not in image_urls]:
            delete_image(url)
        _replace_images(db, post, image_urls)
    post.status = "pending"
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", response_model=Message)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa bài đăng của chính mình."""
    post = db.get(Post, post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    _delete_post_images(post)
    db.delete(post)
    db.commit()
    return Message(detail="Đã xóa bài đăng")


@router.post("/{post_id}/toggle-sold", response_model=PostMineOut)
def toggle_sold(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chủ bài đánh dấu 'Đã bán/Đã xong' (ẩn khỏi feed) hoặc mở lại."""
    post = (
        db.query(Post)
        .options(selectinload(Post.images))
        .filter(Post.id == post_id)
        .first()
    )
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    if post.status == "approved":
        post.status = "closed"
    elif post.status == "closed":
        post.status = "approved"
    else:
        raise HTTPException(
            status_code=400, detail="Chỉ đánh dấu được bài đã được duyệt"
        )
    db.commit()
    db.refresh(post)
    return post


def _delete_post_images(post: Post) -> None:
    """Xóa toàn bộ ảnh của một bài đăng khỏi storage (gồm cả thư mục)."""
    urls = [img.image_url for img in post.images]
    for url in urls:
        delete_image(url)
    if urls:
        delete_folder_by_url(urls[0])


@router.post("/{post_id}/contact", response_model=PostContactResponse)
def contact_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_phone_user),
):
    """Nhấn 'Liên hệ' với bài đăng — gửi phiếu ai mua/ai bán về admin."""
    post = db.get(Post, post_id)
    if not post or post.status != "approved":
        raise HTTPException(status_code=404, detail="Không tìm thấy bài đăng")
    if post.user_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Bạn không thể liên hệ với bài đăng của chính mình"
        )

    # Bài 'sell' (chủ bài bán) -> người liên hệ là người mua, và ngược lại.
    interested_role = "buyer" if post.post_type == "sell" else "seller"
    contact_record = PostContact(
        post_id=post.id,
        interested_user_id=current_user.id,
        poster_user_id=post.user_id,
        interested_role=interested_role,
    )
    db.add(contact_record)
    db.commit()
    db.refresh(contact_record)
    notify_post_contact(contact_record.id)

    contact = get_default_contact(db)
    if not contact:
        raise HTTPException(
            status_code=503, detail="Shop chưa cấu hình thông tin liên hệ"
        )
    return PostContactResponse(
        contact=ContactInfoOut(
            name=contact.name,
            zalo_link=contact.zalo_link,
            facebook_link=contact.facebook_link,
            phone=contact.phone,
        ),
        message=(
            "Yêu cầu liên hệ đã được gửi tới shop. Vui lòng liên hệ Zalo/Facebook "
            "bên dưới, shop sẽ kết nối hai bên mua - bán."
        ),
    )
