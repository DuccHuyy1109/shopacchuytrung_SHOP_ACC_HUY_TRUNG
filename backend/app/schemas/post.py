from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import ContactInfoOut


class PostImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    sort_order: int


class PostCreate(BaseModel):
    post_type: str = Field(pattern="^(buy|sell)$")
    title: str | None = Field(default=None, max_length=200)
    caption: str | None = None
    price: float | None = Field(default=None, ge=0)
    image_urls: list[str] = []


class PostUpdate(BaseModel):
    post_type: str | None = Field(default=None, pattern="^(buy|sell)$")
    title: str | None = None
    caption: str | None = None
    price: float | None = None
    image_urls: list[str] | None = None


class PostOut(BaseModel):
    """Bản công khai — ẩn hoàn toàn danh tính người đăng."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    post_type: str
    title: str | None = None
    caption: str | None = None
    price: float | None = None
    status: str
    is_pinned: bool = False
    by_admin: bool = False
    created_at: datetime | None = None
    images: list[PostImageOut] = []


class PostMineOut(PostOut):
    """Bản dành cho chính chủ bài đăng (xem được trạng thái duyệt)."""

    updated_at: datetime | None = None


class PostAuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None


class PostAdminOut(PostMineOut):
    """Bản dành cho admin — lộ danh tính người đăng."""

    author: PostAuthorOut | None = None


class PostContactResponse(BaseModel):
    contact: ContactInfoOut
    message: str


class PostBulkStatus(BaseModel):
    ids: list[int]
    status: str = Field(pattern="^(approved|rejected)$")


class PostPinUpdate(BaseModel):
    is_pinned: bool
