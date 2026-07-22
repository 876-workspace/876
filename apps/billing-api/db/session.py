from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


def make_engine(database_url: str) -> AsyncEngine:
    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    connect_args: dict[str, object] = {}
    if "?" in url:
        base_url, query = url.split("?", 1)
        lowered_query = query.lower()
        if "sslmode=disable" in lowered_query or "ssl=disable" in lowered_query:
            connect_args["ssl"] = False
        elif "sslmode" in lowered_query or "ssl=" in lowered_query:
            connect_args["ssl"] = True
        url = base_url

    if url.startswith("postgresql+asyncpg://"):
        if "ssl" not in connect_args:
            is_local = "@localhost" in url or "@127.0.0.1" in url or "@db:" in url
            connect_args["ssl"] = not is_local
        connect_args.setdefault("statement_cache_size", 0)
        return create_async_engine(url, poolclass=NullPool, connect_args=connect_args)

    return create_async_engine(url, pool_pre_ping=True, connect_args=connect_args)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = getattr(app.state, "settings", None) or get_settings()
    if not settings.database_url:
        logger.warning("db.lifespan.no_database_url")
        yield
        return

    engine = make_engine(settings.database_url)
    app.state.engine = engine
    AsyncSessionLocal.configure(bind=engine)
    try:
        yield
    finally:
        await engine.dispose()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            logger.error("db.transaction.rollback", exc_info=True)
            await session.rollback()
            raise
