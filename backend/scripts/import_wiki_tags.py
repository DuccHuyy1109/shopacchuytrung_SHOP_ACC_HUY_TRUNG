"""Đồng bộ tên trang phục / súng / bộ sưu tập (wiki_items) vào danh sách mẫu mô tả
'đặc điểm' (description_tags) với giá = 0, tag_type = 1.

Chạy:  cd backend && python scripts/import_wiki_tags.py

  - Idempotent: thêm tên mới (bỏ qua trùng, cột text UNIQUE) VÀ xóa các tag đã
    auto-import thuộc thể loại bị loại (Nền, Ảnh đại diện) — chạy lại để đồng bộ.
  - KHÔNG đụng tag do người tạo tay (chỉ xóa tag tự nhập: gia_tien=0, tag_type=1).
  - Đảo lại được: xóa các tag value=0 trùng tên wiki.
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
# Thể loại KHÔNG đưa vào mô tả acc: 56 = Ảnh đại diện, 57 = Nền.
EXCLUDE_GENRES = [56, 57]


def _norm_names(query) -> set[str]:
    out: set[str] = set()
    for (n,) in query:
        t = (n or "").strip()[:MAX_LEN]
        if t:
            out.add(t)
    return out


def main() -> None:
    with SessionLocal() as session:
        keep = _norm_names(
            session.query(WikiItem.name_vi)
            .filter(WikiItem.genre.notin_(EXCLUDE_GENRES))
            .distinct()
        )
        excluded = _norm_names(
            session.query(WikiItem.name_vi)
            .filter(WikiItem.genre.in_(EXCLUDE_GENRES))
            .distinct()
        )

    # Tên chỉ thuộc thể loại bị loại (không trùng tên ở thể loại khác) -> xóa.
    to_delete = excluded - keep
    rows = [{"text": t, "gia_tien": 0, "tag_type": 1, "sort_order": 0} for t in keep]
    print(f"Tên giữ lại: {len(rows)} | Tên cần loại (Nền/Ảnh đại diện): {len(to_delete)}", flush=True)

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

    print(f"Đã thêm mới: {added} | Đã xóa (Nền/Ảnh đại diện): {deleted}", flush=True)


if __name__ == "__main__":
    main()
