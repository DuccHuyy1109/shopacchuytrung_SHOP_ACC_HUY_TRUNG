from fastapi import APIRouter, Depends

from app.core.deps import require_admin
from app.services import wiki_sync

router = APIRouter(
    prefix="/api/admin/wiki",
    tags=["Admin - Wiki"],
    dependencies=[Depends(require_admin)],
)


@router.post("/sync")
def admin_sync_wiki() -> dict:
    """Cập nhật NHANH (incremental): quét phần mới/thay đổi ở đầu danh sách rồi
    dừng — đủ nhanh để chạy trong 1 request (kể cả trên serverless). Đồng bộ
    toàn bộ do cron GitHub lo."""
    stats = wiki_sync.sync(incremental=True)
    return {
        "message": (
            f"Đã cập nhật: thêm {stats['added']}, sửa {stats['updated']} "
            f"(quét {stats['scanned']} món)."
        ),
        **stats,
    }
