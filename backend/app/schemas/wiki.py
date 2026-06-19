from pydantic import BaseModel, ConfigDict


class WikiItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name_vi: str
    icon: str | None = None
    category: int
    genre: int
    rare: int
    gender: int
    level: int | None = None
    tags: str | None = None
    sub_items: str | None = None


class WikiItemDetailOut(BaseModel):
    """Chi tiết 1 món + các món liên quan cùng bộ."""

    item: WikiItemOut
    pieces: list[WikiItemOut]  # các món thành phần (nếu món này là 1 bộ)
    bundles: list[WikiItemOut]  # các bộ có chứa món này


class WikiFacet(BaseModel):
    """Một giá trị lọc kèm số lượng (vd thể loại 'Áo' có 2321 món)."""

    id: int
    label: str
    count: int


class WikiMetaOut(BaseModel):
    genres: list[WikiFacet]
    rares: list[WikiFacet]
    total: int
