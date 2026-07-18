from sqlalchemy import delete, select

from core.timestamps import now_unix_seconds
from db.models import ReservedUsername
from db.repositories.base import BaseRepository


class ReservedUsernameRepository(BaseRepository):
    async def is_reserved(self, username: str) -> bool:
        """Exact, case-insensitive match against the reserved list."""
        normalized = username.lower().strip()
        if not normalized:
            return False
        return (await self.db.get(ReservedUsername, normalized)) is not None

    async def get(self, username: str) -> ReservedUsername | None:
        normalized = username.lower().strip()
        return await self.db.get(ReservedUsername, normalized) if normalized else None

    async def list_all(self) -> list[ReservedUsername]:
        stmt = select(ReservedUsername).order_by(ReservedUsername.username.asc())
        return list((await self.db.scalars(stmt)).all())

    async def create(self, username: str, reason: str | None = None) -> ReservedUsername:
        normalized = username.lower().strip()
        row = ReservedUsername(username=normalized, reason=reason, created_at=now_unix_seconds())
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def delete(self, username: str) -> bool:
        normalized = username.lower().strip()
        result = await self.db.execute(
            delete(ReservedUsername).where(ReservedUsername.username == normalized)
        )
        return bool(getattr(result, "rowcount", 0) > 0)
