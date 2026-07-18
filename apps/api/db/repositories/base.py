from typing import Any, TypeVar

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def cursor_paginate(
        self,
        model: type[ModelT],
        cursor_field: str,
        limit: int,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[Any], bool]:
        col = getattr(model, cursor_field)
        pk = getattr(model, "id", None)

        if starting_after is not None and pk is not None:
            anchor = await self.db.get(model, starting_after)
            if anchor is None:
                return [], False
            cursor_val = getattr(anchor, cursor_field)
            stmt = select(model).where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None and pk is not None:
            anchor = await self.db.get(model, ending_before)
            if anchor is None:
                return [], False
            cursor_val = getattr(anchor, cursor_field)
            stmt = select(model).where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            # Return in descending order to match caller expectations
            return list(reversed(rows[:limit])), has_more

        stmt = select(model).order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more

    async def cursor_paginate_filtered(
        self,
        model: type[ModelT],
        filters: list[ColumnElement[bool]],
        cursor_field: str,
        limit: int,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[Any], bool]:
        """cursor_paginate with additional WHERE clauses."""
        col = getattr(model, cursor_field)
        pk = getattr(model, "id", None)

        def base_stmt() -> Any:
            s = select(model)
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None and pk is not None:
            anchor = await self.db.get(model, starting_after)
            if anchor is None:
                return [], False
            cursor_val = getattr(anchor, cursor_field)
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None and pk is not None:
            anchor = await self.db.get(model, ending_before)
            if anchor is None:
                return [], False
            cursor_val = getattr(anchor, cursor_field)
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more
