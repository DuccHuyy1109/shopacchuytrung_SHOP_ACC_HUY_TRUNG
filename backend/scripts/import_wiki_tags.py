"""Đồng bộ tên trang phục / súng / bộ sưu tập (wiki_items) vào danh sách mẫu mô tả
'đặc điểm' (description_tags) với giá = 0, tag_type = 1.

Chạy:  cd backend && python scripts/import_wiki_tags.py

  Quy tắc làm sạch (idempotent, chạy lại để đồng bộ):
  - GIỮ: bộ đồ (bundle) + các món lẻ KHÔNG thuộc bộ nào (áo/quần... đứng riêng) + Nền.
  - LOẠI: các món là THÀNH PHẦN bên trong 1 bộ đồ (tránh trùng), và thể loại
    Ảnh đại diện.
  - KHÔNG đụng tag do người tạo tay (chỉ xóa tag tự nhập: gia_tien=0, tag_type=1).
  - Tên vừa là thành phần vừa là món lẻ riêng -> vẫn GIỮ (an toàn).
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

from app.database import SessionLocal, engine
from app.models import DescriptionTag, WikiItem

MAX_LEN = 150  # độ dài cột description_tags.text
# Thể loại KHÔNG đưa vào mô tả acc: 56 = Ảnh đại diện. (Nền=57 thì GIỮ.)
EXCLUDE_GENRES = [56]


def main() -> None:
    with SessionLocal() as session:
        # id các món là THÀNH PHẦN của 1 bộ đồ (nằm trong sub_items của bộ nào đó).
        component_ids: set[int] = set()
        for (sub,) in (
            session.query(WikiItem.sub_items)
            .filter(WikiItem.sub_items.isnot(None))
            .all()
        ):
            for part in (sub or "").strip(",").split(","):
                if part.strip().isdigit():
                    component_ids.add(int(part))

        items = session.query(
            WikiItem.id, WikiItem.name_vi, WikiItem.genre
        ).all()

    keep: set[str] = set()
    excluded: set[str] = set()
    for iid, name, genre in items:
        t = (name or "").strip()[:MAX_LEN]
        if not t:
            continue
        # Loại nếu: Ảnh đại diện HOẶC là thành phần trong 1 bộ đồ.
        if genre in EXCLUDE_GENRES or iid in component_ids:
            excluded.add(t)
        else:
            keep.add(t)

    # Tên CHỈ bị loại (không đồng thời là 1 món giữ lại) -> xóa khỏi danh sách.
    to_delete = excluded - keep
    rows = [{"text": t, "gia_tien": 0, "tag_type": 1, "sort_order": 0} for t in keep]
    print(
        f"Giữ lại: {len(rows)} | Loại (thành phần bộ + Ảnh đại diện): {len(to_delete)}",
        flush=True,
    )

    # ---- Thêm mới (idempotent) ----
    added = 0
    if engine.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert

        with engine.begin() as conn:
            for i in range(0, len(rows), 500):
                stmt = insert(DescriptionTag.__table__).values(rows[i : i + 500])
                stmt = stmt.on_conflict_do_nothing(index_elements=["text"])
                added += conn.execute(stmt).rowcount or 0
    else:
        with SessionLocal() as session:
            existing = {t.lower() for (t,) in session.query(DescriptionTag.text).all()}
            for r in rows:
                if r["text"].lower() not in existing:
                    session.add(DescriptionTag(**r))
                    added += 1
            session.commit()

    # ---- Xóa tag thuộc thể loại bị loại (chỉ tag tự nhập: gia_tien=0, type=1) ----
    deleted = 0
    if to_delete:
        names = list(to_delete)
        with SessionLocal() as session:
            for i in range(0, len(names), 500):
                deleted += (
                    session.query(DescriptionTag)
                    .filter(
                        DescriptionTag.text.in_(names[i : i + 500]),
                        DescriptionTag.gia_tien == 0,
                        DescriptionTag.tag_type == 1,
                    )
                    .delete(synchronize_session=False)
                )
            session.commit()

    print(f"Đã thêm mới: {added} | Đã xóa (thành phần bộ + Ảnh đại diện): {deleted}", flush=True)


if __name__ == "__main__":
    main()
