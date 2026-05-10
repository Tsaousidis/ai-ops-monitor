from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.pool import NullPool
from app.db.base import Base
from app.core.settings import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.LOG_SQL,
    future=True,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)
