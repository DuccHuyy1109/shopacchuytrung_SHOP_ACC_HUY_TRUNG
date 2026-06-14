from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ----- Database -----
    # Nếu DATABASE_URL có giá trị (vd chuỗi kết nối Supabase Postgres) thì DÙNG
    # LUÔN nó; ngược lại build chuỗi kết nối SQL Server từ các biến DB_* bên dưới.
    DATABASE_URL: str = ""
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"
    DB_SERVER: str = "localhost"
    DB_NAME: str = "ShopAccHuyTrungDB"
    DB_USERNAME: str = "sa"
    DB_PASSWORD: str = ""
    DB_PORT: str = "1433"
    DB_TRUSTED_CONNECTION: bool = False

    # ----- JWT / Security -----
    SECRET_KEY: str = "change-this-to-a-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ----- App -----
    # Đặt "production" khi deploy: tắt trang /docs & /redoc (giấu schema API).
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Shop Acc Huy Trung"
    BASE_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000"
    UPLOAD_DIR: str = "uploads"

    # ----- Default admin (seeded on first run) -----
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Admin@123456"
    ADMIN_EMAIL: str = "admin@shopacchuytrung.com"

    # ----- Telegram -----
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # ----- Supabase Storage (lưu ảnh) -----
    # Để trống -> lưu ảnh vào ổ đĩa local (uploads/). Điền đủ URL + service key
    # -> ảnh tự lưu lên Supabase Storage (dùng cho production).
    SUPABASE_URL: str = ""  # vd: https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY: str = ""  # service_role key (BÍ MẬT, chỉ dùng ở backend)
    SUPABASE_BUCKET: str = "image"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def use_supabase_storage(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_KEY)

    @property
    def is_postgres(self) -> bool:
        """True nếu đang dùng Postgres (Supabase) qua DATABASE_URL."""
        return bool(self.DATABASE_URL.strip())

    @property
    def mssql_database_url(self) -> str:
        """Chuỗi kết nối SQL Server (build từ các biến DB_*) — luôn dùng được
        kể cả khi đã bật DATABASE_URL (phục vụ migrate)."""
        parts = [
            f"DRIVER={{{self.DB_DRIVER}}}",
            f"SERVER={self.DB_SERVER},{self.DB_PORT}",
            f"DATABASE={self.DB_NAME}",
        ]
        if self.DB_TRUSTED_CONNECTION:
            parts.append("Trusted_Connection=yes")
        else:
            parts.append(f"UID={self.DB_USERNAME}")
            parts.append(f"PWD={self.DB_PASSWORD}")
        parts.append("TrustServerCertificate=yes")
        odbc_str = quote_plus(";".join(parts))
        return f"mssql+pyodbc:///?odbc_connect={odbc_str}"

    @property
    def database_url(self) -> str:
        """Chuỗi kết nối SQLAlchemy.

        Ưu tiên DATABASE_URL (Postgres/Supabase); nếu trống thì dùng SQL Server.
        """
        if self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()
            # Chuẩn hóa scheme kiểu cũ "postgres://" -> "postgresql://".
            if url.startswith("postgres://"):
                url = "postgresql://" + url[len("postgres://") :]
            return url
        return self.mssql_database_url

    @property
    def master_database_url(self) -> str:
        """Connection to the `master` DB, used to CREATE the app database."""
        parts = [
            f"DRIVER={{{self.DB_DRIVER}}}",
            f"SERVER={self.DB_SERVER},{self.DB_PORT}",
            "DATABASE=master",
        ]
        if self.DB_TRUSTED_CONNECTION:
            parts.append("Trusted_Connection=yes")
        else:
            parts.append(f"UID={self.DB_USERNAME}")
            parts.append(f"PWD={self.DB_PASSWORD}")
        parts.append("TrustServerCertificate=yes")
        odbc_str = quote_plus(";".join(parts))
        return f"mssql+pyodbc:///?odbc_connect={odbc_str}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
