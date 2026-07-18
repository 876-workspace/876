import time
from typing import Any

from sqlalchemy import delete, select, update

from db.models import ApiKey
from db.repositories.base import BaseRepository


class ApiKeyRepository(BaseRepository):
    async def get_by_hash(self, key_hash: str) -> ApiKey | None:
        stmt = select(ApiKey).where(ApiKey.key_hash == key_hash)
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> ApiKey:
        key = ApiKey(**kwargs)
        self.db.add(key)
        await self.db.flush()
        await self.db.refresh(key)
        return key

    async def list_by_app(
        self,
        app_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[ApiKey], bool]:
        col = ApiKey.created_at

        if starting_after:
            anchor = await self.db.get(ApiKey, starting_after)
            if anchor is None:
                return [], False
            stmt = (
                select(ApiKey)
                .where(ApiKey.app_id == app_id, col < anchor.created_at)
                .order_by(col.desc())
                .limit(limit + 1)
            )
        elif ending_before:
            anchor = await self.db.get(ApiKey, ending_before)
            if anchor is None:
                return [], False
            stmt = (
                select(ApiKey)
                .where(ApiKey.app_id == app_id, col > anchor.created_at)
                .order_by(col.asc())
                .limit(limit + 1)
            )
        else:
            stmt = (
                select(ApiKey)
                .where(ApiKey.app_id == app_id)
                .order_by(col.desc())
                .limit(limit + 1)
            )

        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items = list(reversed(items))
        return items, has_more

    async def delete(self, key_id: str, *, app_id: str | None = None) -> bool:
        stmt = delete(ApiKey).where(ApiKey.id == key_id)
        if app_id:
            stmt = stmt.where(ApiKey.app_id == app_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def update(
        self,
        key_id: str,
        *,
        app_id: str | None = None,
        **kwargs: object,
    ) -> ApiKey | None:
        stmt = update(ApiKey).where(ApiKey.id == key_id)
        if app_id:
            stmt = stmt.where(ApiKey.app_id == app_id)
        stmt = stmt.values(**kwargs).returning(ApiKey)
        return (await self.db.scalars(stmt)).first()

    async def revoke(
        self,
        key_id: str,
        *,
        app_id: str | None = None,
    ) -> ApiKey | None:
        now = int(time.time())
        stmt = update(ApiKey).where(ApiKey.id == key_id)
        if app_id:
            stmt = stmt.where(ApiKey.app_id == app_id)
        stmt = stmt.values(revoked=True, last_used_at=now).returning(ApiKey)
        return (await self.db.scalars(stmt)).first()
