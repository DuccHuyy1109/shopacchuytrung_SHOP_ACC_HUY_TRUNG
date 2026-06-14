from fastapi import APIRouter

from app.routers.admin import (
    catalog as admin_catalog,
    dashboard as admin_dashboard,
    orders as admin_orders,
    posts as admin_posts,
    settings as admin_settings,
    users as admin_users,
    wallet as admin_wallet,
)

admin_router = APIRouter()
admin_router.include_router(admin_dashboard.router)
admin_router.include_router(admin_users.router)
admin_router.include_router(admin_catalog.router)
admin_router.include_router(admin_orders.router)
admin_router.include_router(admin_posts.router)
admin_router.include_router(admin_settings.router)
admin_router.include_router(admin_wallet.router)
