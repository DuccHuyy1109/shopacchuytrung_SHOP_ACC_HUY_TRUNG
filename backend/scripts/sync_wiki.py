"""Đồng bộ TOÀN BỘ dữ liệu Wiki (trang phục + súng + bộ sưu tập) vào Supabase.

Chạy local:   cd backend && python scripts/sync_wiki.py
Chạy CI:      GitHub Actions truyền DATABASE_URL qua biến môi trường.

Logic nằm ở app/services/wiki_sync.py (dùng chung với endpoint admin). Script này
chỉ là wrapper chạy chế độ FULL (không incremental) — phù hợp cho cron hằng ngày.
"""

import os
import sys

# Cho phép `import app.*` và để pydantic-settings đọc đúng backend/.env.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

from app.services import wiki_sync


def main() -> None:
    print("=== ĐỒNG BỘ WIKI (FULL) ===", flush=True)
    stats = wiki_sync.sync(incremental=False, log=lambda m: print(m, flush=True))
    print(f"=== HOÀN TẤT: {stats['scanned']} món — {stats['per_category']} ===", flush=True)


if __name__ == "__main__":
    main()
