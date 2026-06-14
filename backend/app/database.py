from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import settings

# fast_executemany chỉ áp dụng cho SQL Server (pyodbc); Postgres không có.
_engine_kwargs: dict = {"pool_pre_ping": True, "echo": False}
if not settings.is_postgres:
    _engine_kwargs["fast_executemany"] = True

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
