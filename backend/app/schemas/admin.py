from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.post import PostAuthorOut, PostOut


class PostStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|approved|rejected|closed)$")


class AccountBriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_code: str
    sale_price: float


class AccountContactAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_id: int
    customer_name: str | None = None
    customer_phone: str | None = None
    status: str
    telegram_sent: bool
    created_at: datetime | None = None
    account: AccountBriefOut | None = None
    user: PostAuthorOut | None = None


class AccountContactStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|processing|done)$")


class PostContactAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: int
    interested_role: str
    telegram_sent: bool
    created_at: datetime | None = None
    post: PostOut | None = None
    interested_user: PostAuthorOut | None = None
    poster_user: PostAuthorOut | None = None


class DashboardTimePoint(BaseModel):
    date: str  # YYYY-MM-DD
    accounts: int
    orders: int


class DashboardTopAccount(BaseModel):
    id: int
    account_code: str
    sale_price: float
    contact_count: int
    view_count: int


class DashboardStats(BaseModel):
    total_users: int
    total_accounts: int
    available_accounts: int
    sold_accounts: int
    total_orders: int
    pending_orders: int
    paid_orders: int
    total_posts: int
    pending_posts: int
    approved_posts: int
    total_account_contacts: int
    total_post_contacts: int
    # Nâng cao
    deposit_revenue: float = 0
    revenue_this_month: float = 0
    orders_pending_confirm: int = 0
    timeseries: list[DashboardTimePoint] = []
    top_accounts: list[DashboardTopAccount] = []
