import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, catalog, orders, posts, public, uploads, wallet, wiki
from app.routers.admin import admin_router

logging.basicConfig(level=logging.INFO)

# Production: tắt /docs, /redoc và /openapi.json để không lộ schema API.
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="API mua bán acc Free Fire — Shop Acc Huy Trung",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phục vụ ảnh đã upload từ ổ đĩa local. Trên serverless (Vercel) ổ đĩa
# chỉ đọc -> bỏ qua (ảnh đã lưu trên Supabase Storage, không cần mount).
try:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "images"), exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
except OSError:
    pass

# Đăng ký router.
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(orders.router)
app.include_router(posts.router)
app.include_router(public.router)
app.include_router(uploads.router)
app.include_router(wallet.router)
app.include_router(wiki.router)
app.include_router(admin_router)


@app.get("/", tags=["Health"])
def root():
    info = {"message": f"{settings.PROJECT_NAME} API"}
    if not settings.is_production:
        info["docs"] = "/docs"
    return info


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
