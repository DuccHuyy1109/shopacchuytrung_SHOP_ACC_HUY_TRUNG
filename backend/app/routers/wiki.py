from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WikiItem
from app.schemas.common import Page
from app.schemas.wiki import (
    WikiFacet,
    WikiItemDetailOut,
    WikiItemOut,
    WikiMetaOut,
)
from app.services.wiki_sync import GENRE_LABELS, RARE_LABELS

router = APIRouter(prefix="/api/wiki", tags=["Wiki Trang Phục"])


def _order_for(sort: str):
    if sort == "name":
        return (WikiItem.name_vi.asc(),)
    return (WikiItem.id.desc(),)  # newest (mặc định)


def _parse_ids(joined: str | None) -> list[int]:
    if not joined:
        return []
    return [int(x) for x in joined.strip(",").split(",") if x.strip().isdigit()]


@router.get("/items", response_model=Page[WikiItemOut])
def list_wiki_items(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Tìm theo tên"),
    category: int = Query(3, description="3=Trang Phục, 10=Súng, 4=Bộ Sưu Tập"),
    genre: int | None = None,
    rare: int | None = None,
    gender: int | None = None,
    tag: int | None = None,
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
):
    """Danh sách món — tìm kiếm, lọc và phân trang."""
    query = db.query(WikiItem)
    if category:
        query = query.filter(WikiItem.category == category)
    if q and q.strip():
        query = query.filter(WikiItem.name_vi.ilike(f"%{q.strip()}%"))
    if genre:
        query = query.filter(WikiItem.genre == genre)
    if rare:
        query = query.filter(WikiItem.rare == rare)
    if gender is not None:
        query = query.filter(WikiItem.gender == gender)
    if tag:
        query = query.filter(WikiItem.tags.like(f"%,{tag},%"))

    total = query.count()
    items = (
        query.order_by(*_order_for(sort), WikiItem.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page.create(
        [WikiItemOut.model_validate(i) for i in items], total, page, page_size
    )


@router.get("/meta", response_model=WikiMetaOut)
def wiki_meta(
    db: Session = Depends(get_db),
    category: int = Query(3),
):
    """Số lượng theo thể loại & độ hiếm (để render chip lọc khớp dữ liệu thật)."""
    base = db.query(WikiItem)
    if category:
        base = base.filter(WikiItem.category == category)

    total = base.count()
    genre_rows = (
        base.with_entities(WikiItem.genre, func.count().label("c"))
        .group_by(WikiItem.genre)
        .all()
    )
    rare_rows = (
        base.with_entities(WikiItem.rare, func.count().label("c"))
        .group_by(WikiItem.rare)
        .all()
    )
    genres = [
        WikiFacet(id=g, label=GENRE_LABELS.get(g, f"Thể loại {g}"), count=c)
        for g, c in sorted(genre_rows, key=lambda r: -r[1])
    ]
    rares = [
        WikiFacet(id=r, label=RARE_LABELS.get(r, f"Độ hiếm {r}"), count=c)
        for r, c in sorted(rare_rows, key=lambda r: r[0])
    ]
    return WikiMetaOut(genres=genres, rares=rares, total=total)


@router.get("/items/{item_id}", response_model=WikiItemDetailOut)
def wiki_item_detail(item_id: int, db: Session = Depends(get_db)):
    """Chi tiết 1 món + các món liên quan cùng bộ (2 chiều)."""
    item = db.get(WikiItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy món này")

    # pieces: các món thành phần nếu món này là 1 bộ (sub_items).
    piece_ids = _parse_ids(item.sub_items)
    pieces = []
    if piece_ids:
        found = {
            p.id: p
            for p in db.query(WikiItem).filter(WikiItem.id.in_(piece_ids)).all()
        }
        pieces = [found[pid] for pid in piece_ids if pid in found]

    # bundles: các bộ có chứa món này.
    bundles = (
        db.query(WikiItem)
        .filter(WikiItem.sub_items.like(f"%,{item_id},%"))
        .order_by(WikiItem.id.desc())
        .all()
    )

    return WikiItemDetailOut(
        item=WikiItemOut.model_validate(item),
        pieces=[WikiItemOut.model_validate(p) for p in pieces],
        bundles=[WikiItemOut.model_validate(b) for b in bundles],
    )
