"""Sao chép TOÀN BỘ dữ liệu từ SQL Server (local) -> Supabase Postgres.

Chạy 1 lần khi chuyển CSDL sang Supabase. KHÔNG xóa/đụng dữ liệu ở SQL Server
(chỉ đọc). Sẽ XÓA dữ liệu hiện có trên Supabase rồi chép y hệt từ SQL Server.

Yêu cầu trong .env:
  - DATABASE_URL = chuỗi Supabase Postgres (đích)
  - DB_* (DB_SERVER, DB_NAME...) trỏ tới SQL Server (nguồn)

Chạy:  python migrate_to_supabase.py
"""

import sys

from sqlalchemy import Integer, create_engine, insert, select, text

import app.models  # noqa: F401  (đăng ký toàn bộ bảng vào Base.metadata)
from app.config import settings
from app.database import Base

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass


def main() -> None:
    if not settings.is_postgres:
        print("LỖI: .env chưa có DATABASE_URL (Postgres). Hãy điền trước khi migrate.")
        sys.exit(1)

    src = create_engine(settings.mssql_database_url)  # SQL Server (nguồn)
    dst = create_engine(settings.database_url)  # Supabase Postgres (đích)

    # parent -> child (an toàn khóa ngoại khi chèn)
    tables = list(Base.metadata.sorted_tables)

    # Tạo sẵn toàn bộ bảng ở đích (Supabase mới còn trống).
    print("=== TẠO BẢNG Ở SUPABASE ĐÍCH ===")
    Base.metadata.create_all(bind=dst)
    print("Đã tạo/đồng bộ toàn bộ bảng.")

    print("=== ĐỌC DỮ LIỆU TỪ SQL SERVER ===")
    data: dict[str, list[dict]] = {}
    for t in tables:
        try:
            with src.connect() as s:
                rows = [dict(r) for r in s.execute(select(t)).mappings().all()]
            data[t.name] = rows
            print(f"  {t.name}: {len(rows)} dòng")
        except Exception:  # noqa: BLE001
            data[t.name] = []
            print(f"  {t.name}: (bỏ qua — không có ở nguồn)")

    total = sum(len(v) for v in data.values())
    print(f"Tổng cộng {total} dòng. Bắt đầu chép sang Supabase...")

    print("=== CHÉP SANG SUPABASE (trong 1 transaction) ===")
    with dst.begin() as d:
        # 1) Xóa dữ liệu cũ ở đích (đảo thứ tự: con trước, cha sau).
        for t in reversed(tables):
            d.execute(text(f"DELETE FROM {t.name}"))
        # 2) Chèn dữ liệu (cha trước, con sau).
        for t in tables:
            rows = data.get(t.name) or []
            if rows:
                d.execute(insert(t), rows)
            print(f"  {t.name}: chép {len(rows)} dòng")
        # 3) Đồng bộ sequence cho cột id tự tăng (tránh trùng id khi thêm mới).
        for t in tables:
            idcol = t.columns.get("id")
            if idcol is None or not idcol.primary_key:
                continue
            if not isinstance(idcol.type, Integer):
                continue
            maxid = d.execute(text(f"SELECT MAX(id) FROM {t.name}")).scalar()
            if maxid is not None:
                d.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{t.name}', 'id'), "
                        f":m)"
                    ),
                    {"m": int(maxid)},
                )

    print("=== KIỂM TRA SAU MIGRATE ===")
    with dst.connect() as d:
        for t in tables:
            cnt = d.execute(text(f"SELECT count(*) FROM {t.name}")).scalar()
            print(f"  {t.name}: {cnt} dòng")
    print("=== HOÀN TẤT ===")


if __name__ == "__main__":
    main()
