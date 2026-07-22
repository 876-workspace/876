from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncConnection

HEAD_REVISION = "202607220002"


async def current_revision(connection: AsyncConnection) -> str | None:
    try:
        result = await connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
    except SQLAlchemyError:
        return None
    value = result.scalar_one_or_none()
    return str(value) if value is not None else None
