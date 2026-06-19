"""Đồng bộ dữ liệu Wiki (trang phục / súng / bộ sưu tập) từ wiki.ff.garena.vn.

Dùng chung cho:
  - CLI `scripts/sync_wiki.py` (đồng bộ TOÀN BỘ, cho cron GitHub).
  - Endpoint admin `POST /api/admin/wiki/sync` (cập nhật NHANH/incremental).

Đây cũng là NGUỒN NHÃN DUY NHẤT (GENRE_LABELS / RARE_LABELS) — router import từ đây.
"""

import json
import time
import urllib.request

from app.database import Base, engine as default_engine
from app.models import WikiItem

API = "https://wiki.ff.garena.vn/api/app/item?lang=vi"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}
PAGE_LIMIT = 200

# Danh mục đồng bộ + thể loại được phép (None = lấy tất cả thể loại của danh mục).
CATEGORY_CONFIG: dict[int, dict] = {
    3: {"label": "Trang Phục", "genres": None},
    10: {"label": "Súng", "genres": None},
    4: {
        "label": "Bộ Sưu Tập",
        # Chỉ 10 thể loại có ý nghĩa (bỏ voice/music/loading card/lootbox...).
        "genres": [53, 56, 57, 58, 64, 65, 79, 104, 96, 106],
    },
}

CATEGORY_LABELS = {cid: cfg["label"] for cid, cfg in CATEGORY_CONFIG.items()}

GENRE_LABELS = {
    # Trang phục (cat 3)
    3: "Áo",
    4: "Bộ đồ",
    5: "Quần",
    6: "Giày",
    7: "Phụ kiện",
    9: "Đầu",
    10: "Vẽ mặt",
    22: "Bộ trang phục",
    # Súng (cat 10)
    59: "Skin súng",
    129: "Súng trường",
    130: "Súng ngắm tỉa",
    131: "Súng máy",
    132: "Bắn tỉa",
    133: "Súng lục",
    134: "Shotgun",
    135: "Tiểu liên",
    # Bộ sưu tập (cat 4)
    53: "Skywing",
    56: "Ảnh đại diện",
    57: "Nền",
    58: "Hành động gia nhập",
    64: "Nắm đấm",
    65: "Hành động",
    79: "Biến hình",
    104: "Hiệu ứng kết thúc",
    96: "Đòn kết thúc",
    106: "Động tác",
}

RARE_LABELS = {
    1: "Xám",
    2: "Lục",
    3: "Lam",
    4: "Tím",
    5: "Cam",
    6: "Vàng",
    7: "Đỏ",
    8: "Tím+",
    9: "Cam+",
}

# Các cột ghi vào DB (id là khóa, không nằm trong phần cập nhật).
_COLUMNS = [
    "id", "name_vi", "icon", "category",
    "genre", "rare", "gender", "level", "tags", "sub_items",
]
# Các trường so sánh để biết một món có thay đổi không (cho chế độ incremental).
_CORE = ("name_vi", "icon", "genre", "rare", "gender", "level", "sub_items")


def fetch(category: int, genres=None, cursor=None, retries: int = 4) -> dict:
    filt: dict = {"category": [category]}
    if genres:
        filt["genre"] = genres
    body: dict = {"limit": PAGE_LIMIT, "filter": filt}
    if cursor is not None:
        body["cursor"] = cursor
    data = json.dumps(body).encode()
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                API, data=data, headers=HEADERS, method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as err:  # noqa: BLE001  (timeout/blip của CDN Garena)
            last_err = err
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Không gọi được API sau {retries} lần") from last_err


def to_row(it: dict) -> dict:
    tags = it.get("tags")
    tag_str = None
    if tags:
        ids = [str(t.get("id") if isinstance(t, dict) else t) for t in tags]
        tag_str = "," + ",".join(ids) + ","
    subs = it.get("subItems")
    sub_str = None
    if subs:
        sub_str = "," + ",".join(str(s) for s in subs) + ","
    evo = (it.get("stats") or {}).get("evoLevel")
    return {
        "id": int(it["id"]),
        "name_vi": (it.get("translate") or it.get("name") or "")[:300],
        "icon": (it.get("icon") or "")[:500] or None,
        "category": it.get("category") or 0,
        "genre": it.get("genre") or 0,
        "rare": it.get("rare") or 0,
        "gender": it.get("gender") or 0,
        "level": int(evo) if evo else None,
        "tags": tag_str,
        "sub_items": sub_str,
    }


def _core(row: dict) -> tuple:
    return tuple(row.get(k) for k in _CORE)


def upsert(eng, rows: list[dict]) -> None:
    """Upsert theo id. Postgres dùng ON CONFLICT; dialect khác merge từng dòng."""
    if not rows:
        return
    if eng.dialect.name == "postgresql":
        from sqlalchemy import func as sa_func
        from sqlalchemy.dialects.postgresql import insert

        stmt = insert(WikiItem.__table__).values(rows)
        update_cols = {c: stmt.excluded[c] for c in _COLUMNS if c != "id"}
        update_cols["synced_at"] = sa_func.now()
        stmt = stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols)
        with eng.begin() as conn:
            conn.execute(stmt)
    else:
        from sqlalchemy.orm import Session

        with Session(eng) as session:
            for r in rows:
                session.merge(WikiItem(**r))
            session.commit()


def _load_existing(eng) -> dict[int, tuple]:
    """Nạp (id -> core fields) hiện có để phát hiện thay đổi khi incremental."""
    from sqlalchemy import select

    cols = [WikiItem.id] + [getattr(WikiItem, c) for c in _CORE]
    with eng.connect() as conn:
        rows = conn.execute(select(*cols)).all()
    return {r[0]: tuple(r[1:]) for r in rows}


def sync(
    *,
    incremental: bool = False,
    categories: list[int] | None = None,
    engine=None,
    log=print,
) -> dict:
    """Đồng bộ dữ liệu wiki.

    incremental=True: chỉ quét phần MỚI/THAY ĐỔI ở đầu danh sách rồi dừng (nhanh,
    hợp serverless — dùng cho nút admin). incremental=False: quét toàn bộ (cron).
    """
    eng = engine or default_engine
    Base.metadata.create_all(bind=eng)
    cats = categories or list(CATEGORY_CONFIG)
    existing = _load_existing(eng) if incremental else {}

    stats: dict = {"added": 0, "updated": 0, "scanned": 0, "per_category": {}}
    for cat in cats:
        genres = CATEGORY_CONFIG.get(cat, {}).get("genres")
        cursor = None
        seen: set[int] = set()
        c_scan = c_add = c_upd = 0
        while True:
            data = fetch(cat, genres, cursor)
            batch = data.get("data") or []
            if not batch:
                break
            rows: list[dict] = []
            page_unchanged = True
            for it in batch:
                iid = int(it["id"])
                if iid in seen:
                    continue
                seen.add(iid)
                row = to_row(it)
                c_scan += 1
                if not incremental:
                    rows.append(row)
                    page_unchanged = False
                    continue
                prev = existing.get(iid)
                if prev is None:
                    c_add += 1
                    rows.append(row)
                    page_unchanged = False
                elif _core(row) != prev:
                    c_upd += 1
                    rows.append(row)
                    page_unchanged = False
            upsert(eng, rows)
            nxt = data.get("cursor")
            log(f"  {CATEGORY_LABELS.get(cat, cat)}: quét {c_scan} (cursor={nxt})")
            if incremental and page_unchanged:
                break  # đã bắt kịp danh mục này
            if nxt is None:
                break
            cursor = nxt
            time.sleep(0.05)
        stats["scanned"] += c_scan
        stats["added"] += c_add
        stats["updated"] += c_upd
        stats["per_category"][CATEGORY_LABELS.get(cat, str(cat))] = c_scan
    return stats
