"""Làm sạch chữ "Gói" trong mẫu Mô tả tài khoản (description_tags).

Chạy:  python clean_goi_tags.py

Chỉ tác động bảng `description_tags` với tag_type = 1 (Đặc điểm chung):
  - Bỏ token "Gói"/"gói" đứng riêng trong tên tag, vd:
        "Gói Sứ giả ác ma"  ->  "Sứ giả ác ma"
        "Hộp Gói Nữ Săn Kho Báu" -> "Hộp Nữ Săn Kho Báu"
  - Nếu tên sạch ĐÃ tồn tại (vd "Gói Naruto" -> "Naruto" đã có) thì XÓA bản
    "Gói ..." dư (giữ lại tên sạch). Chuyển gia_tien sang bản giữ lại nếu bản
    đó đang = 0 mà bản xóa > 0.

KHÔNG đụng tới bảng wiki (WikiItem) và KHÔNG đụng tới mô tả của acc.
"""

import sys
from decimal import Decimal

# In được tiếng Việt trên console Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

from app.database import SessionLocal
from app.models import DescriptionTag


def strip_goi(text: str) -> str:
    """Bỏ token 'gói' đứng riêng (giữ nguyên các chữ có chứa 'gói' như 'ngói')."""
    tokens = text.split()
    kept = [tok for tok in tokens if tok.lower() != "gói"]
    return " ".join(kept).strip()


def main() -> None:
    db = SessionLocal()
    renamed = deleted = skipped = 0
    try:
        tags = db.query(DescriptionTag).filter(DescriptionTag.tag_type == 1).all()
        # Tên đang được dùng (để kiểm tra trùng — cột text là UNIQUE).
        taken = {t.text for t in tags}
        by_text = {t.text: t for t in tags}

        for tag in list(tags):
            if "gói" not in tag.text.lower():
                continue
            new = strip_goi(tag.text)
            if not new or new == tag.text:
                skipped += 1
                continue

            survivor = by_text.get(new)
            if survivor is not None and survivor is not tag:
                # Tên sạch đã tồn tại -> xóa bản "Gói ..." dư.
                if (survivor.gia_tien or 0) == 0 and (tag.gia_tien or 0) > 0:
                    survivor.gia_tien = tag.gia_tien
                taken.discard(tag.text)
                by_text.pop(tag.text, None)
                db.delete(tag)
                deleted += 1
                print(f"[x] Xóa trùng: {tag.text!r}  (đã có {new!r})")
            else:
                # Đổi tên (chắc chắn không trùng vì 'new' chưa nằm trong taken).
                taken.discard(tag.text)
                by_text.pop(tag.text, None)
                tag.text = new
                taken.add(new)
                by_text[new] = tag
                renamed += 1

        db.commit()
        print(
            f"\n=== HOÀN TẤT ===  Đổi tên: {renamed} | Xóa trùng: {deleted} | "
            f"Bỏ qua: {skipped}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
