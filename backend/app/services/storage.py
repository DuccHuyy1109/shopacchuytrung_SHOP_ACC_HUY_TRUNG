import os
import re
import shutil
import uuid
from io import BytesIO

import httpx
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError

from app.config import settings

_ALLOWED_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10MB ảnh đầu vào
_MAX_DIM = 1600  # tự thu nhỏ cạnh dài nhất về 1600px để tiết kiệm dung lượng
_IMAGE_SUBDIR = "images"


def _validate(file: UploadFile) -> bytes:
    """Xác thực file là ảnh hợp lệ, trả về bytes."""
    if file.content_type not in _ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail="Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF",
        )
    data = file.file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="Ảnh vượt quá dung lượng 10MB")
    if not data:
        raise HTTPException(status_code=400, detail="File ảnh rỗng")
    try:
        Image.open(BytesIO(data)).verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File không phải ảnh hợp lệ")
    return data


def _apply_watermark(data: bytes, text: str) -> bytes:
    """Phủ chữ mờ (tên shop) chéo khắp ảnh để chống lấy cắp.

    Nếu lỗi thì trả ảnh gốc (không làm hỏng luồng upload).
    """
    try:
        base = Image.open(BytesIO(data)).convert("RGBA")
        if max(base.size) > _MAX_DIM:
            base.thumbnail((_MAX_DIM, _MAX_DIM))
        w, h = base.size
        font_size = max(16, w // 18)
        try:
            font = ImageFont.load_default(size=font_size)
        except TypeError:  # Pillow cũ không nhận size
            font = ImageFont.load_default()
        bbox = ImageDraw.Draw(base).textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        # Một "ô" chữ trong suốt, có bóng nhẹ rồi xoay chéo.
        tile = Image.new("RGBA", (tw + 24, th + 24), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        td.text((13, 13), text, font=font, fill=(0, 0, 0, 45))
        td.text((12, 12), text, font=font, fill=(255, 255, 255, 75))
        tile = tile.rotate(30, expand=True)
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for y in range(-tile.height, h, tile.height + 60):
            for x in range(-tile.width, w, tile.width + 60):
                overlay.alpha_composite(tile, (x, y))
        out = Image.alpha_composite(base, overlay).convert("RGB")
        buf = BytesIO()
        out.save(buf, "JPEG", quality=85)
        return buf.getvalue()
    except Exception:  # noqa: BLE001
        return data


def _optimize(data: bytes, content_type: str) -> tuple[bytes, str]:
    """Thu nhỏ ảnh quá lớn + nén lại để tiết kiệm dung lượng.

    Trả về (bytes, content_type). GIF động được giữ nguyên. Lỗi -> trả gốc.
    """
    try:
        img = Image.open(BytesIO(data))
        if getattr(img, "is_animated", False):
            return data, content_type
        if max(img.size) > _MAX_DIM:
            img.thumbnail((_MAX_DIM, _MAX_DIM))
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        buf = BytesIO()
        if has_alpha:
            img.convert("RGBA").save(buf, "PNG", optimize=True)
            return buf.getvalue(), "image/png"
        img.convert("RGB").save(buf, "JPEG", quality=85, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception:  # noqa: BLE001
        return data, content_type


def safe_folder(folder: str | None) -> str:
    """Chuẩn hóa đường dẫn thư mục (nhiều cấp), bỏ ký tự lạ ở từng đoạn.

    Ví dụ: '#48HA21' -> '48HA21', 'posts/abc-123' -> 'posts/abc-123'.
    """
    if not folder:
        return ""
    parts = [re.sub(r"[^A-Za-z0-9_-]", "", p)[:60] for p in folder.split("/")]
    return "/".join(p for p in parts if p)


def _object_path(folder: str | None, filename: str) -> str:
    safe = safe_folder(folder)
    return f"{_IMAGE_SUBDIR}/{safe}/{filename}" if safe else f"{_IMAGE_SUBDIR}/{filename}"


def _object_path_from_url(url: str) -> str | None:
    """Lấy đường dẫn object (trong bucket) từ URL đã lưu."""
    if url.startswith("http"):
        marker = f"/storage/v1/object/public/{settings.SUPABASE_BUCKET}/"
        if marker in url:
            return url.split(marker, 1)[1]
    elif url.startswith("/uploads/"):
        return url[len("/uploads/") :]
    return None


# ==================== SUPABASE STORAGE ====================
def _sb_base() -> str:
    return settings.SUPABASE_URL.rstrip("/")


def _sb_headers(json: bool = False) -> dict[str, str]:
    h = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }
    if json:
        h["Content-Type"] = "application/json"
    return h


def _supabase_upload(data: bytes, object_path: str, content_type: str) -> str:
    """Tải ảnh lên Supabase Storage, trả về URL công khai."""
    headers = _sb_headers()
    headers["Content-Type"] = content_type
    headers["x-upsert"] = "true"
    headers["cache-control"] = "3600"
    url = f"{_sb_base()}/storage/v1/object/{settings.SUPABASE_BUCKET}/{object_path}"
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, content=data, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Không kết nối được Supabase Storage: {exc}"
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Tải ảnh lên Supabase thất bại ({resp.status_code}): "
            f"{resp.text[:200]}",
        )
    return (
        f"{_sb_base()}/storage/v1/object/public/"
        f"{settings.SUPABASE_BUCKET}/{object_path}"
    )


def _supabase_delete_paths(object_paths: list[str]) -> None:
    if not object_paths:
        return
    url = f"{_sb_base()}/storage/v1/object/{settings.SUPABASE_BUCKET}"
    try:
        with httpx.Client(timeout=15) as client:
            client.request(
                "DELETE", url, headers=_sb_headers(json=True),
                json={"prefixes": object_paths},
            )
    except httpx.HTTPError:
        pass


def _supabase_delete(image_url: str) -> None:
    obj = _object_path_from_url(image_url)
    if obj and image_url.startswith("http"):
        _supabase_delete_paths([obj])


def _supabase_delete_prefix(prefix: str) -> None:
    """Liệt kê và xóa toàn bộ object dưới một tiền tố (thư mục)."""
    list_url = f"{_sb_base()}/storage/v1/object/list/{settings.SUPABASE_BUCKET}"
    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                list_url,
                headers=_sb_headers(json=True),
                json={"prefix": prefix, "limit": 1000},
            )
            if resp.status_code != 200:
                return
            names = [it.get("name") for it in resp.json() if it.get("name")]
    except httpx.HTTPError:
        return
    _supabase_delete_paths([f"{prefix}/{name}" for name in names])


# ==================== LOCAL DISK ====================
def _local_save(data: bytes, object_path: str) -> str:
    full = os.path.join(settings.UPLOAD_DIR, *object_path.split("/"))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)
    return f"/uploads/{object_path}"


def _local_delete(image_url: str) -> None:
    obj = _object_path_from_url(image_url)
    if not obj or image_url.startswith("http"):
        return
    try:
        os.remove(os.path.join(settings.UPLOAD_DIR, *obj.split("/")))
    except OSError:
        pass


def _local_delete_prefix(prefix: str) -> None:
    path = os.path.join(settings.UPLOAD_DIR, *prefix.split("/"))
    shutil.rmtree(path, ignore_errors=True)


# ==================== PUBLIC API ====================
def save_image(
    file: UploadFile,
    folder: str | None = None,
    watermark_text: str | None = None,
) -> str:
    """Lưu một ảnh sau khi xác thực, trả về URL.

    `folder` (nhiều cấp được) gom ảnh vào thư mục riêng, vd: mã acc, 'dang_bai/<id>'.
    `watermark_text` (nếu có) sẽ phủ chữ mờ chống lấy cắp (ảnh chuyển sang JPEG).
    Dùng Supabase Storage nếu đã cấu hình, ngược lại lưu local.
    """
    data = _validate(file)
    content_type = file.content_type
    if watermark_text:
        data = _apply_watermark(data, watermark_text)
        content_type = "image/jpeg"
    else:
        data, content_type = _optimize(data, content_type)
    ext = _ALLOWED_EXT.get(content_type, ".jpg")
    object_path = _object_path(folder, f"{uuid.uuid4().hex}{ext}")
    if settings.use_supabase_storage:
        return _supabase_upload(data, object_path, content_type)
    return _local_save(data, object_path)


def delete_image(image_url: str) -> None:
    """Xóa một ảnh (Supabase hoặc local tùy theo dạng URL)."""
    if not image_url:
        return
    if image_url.startswith("http"):
        _supabase_delete(image_url)
    else:
        _local_delete(image_url)


def delete_folder(folder: str | None) -> None:
    """Xóa toàn bộ thư mục ảnh theo tên (vd: mã acc)."""
    safe = safe_folder(folder)
    if not safe:
        return
    prefix = f"{_IMAGE_SUBDIR}/{safe}"
    if settings.use_supabase_storage:
        _supabase_delete_prefix(prefix)
    _local_delete_prefix(prefix)


def delete_folder_by_url(image_url: str) -> None:
    """Xóa cả thư mục chứa một ảnh (suy ra từ URL). An toàn: không bao giờ
    xóa thư mục gốc 'images'."""
    obj = _object_path_from_url(image_url or "")
    if not obj or "/" not in obj:
        return
    parent = obj.rsplit("/", 1)[0]
    if not parent or parent == _IMAGE_SUBDIR:
        return
    if image_url.startswith("http"):
        if settings.use_supabase_storage:
            _supabase_delete_prefix(parent)
    else:
        _local_delete_prefix(parent)
