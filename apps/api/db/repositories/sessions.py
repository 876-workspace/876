from typing import Any

from sqlalchemy import delete, select

from db.models import Session
from db.repositories.base import BaseRepository


class SessionRepository(BaseRepository):
    async def get_by_token_hash(self, token_hash: str) -> Session | None:
        stmt = select(Session).where(Session.token_hash == token_hash)
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> Session:
        session = Session(**kwargs)
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def list_by_user(
        self,
        user_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[Session], bool]:
        col = Session.created_at

        if starting_after:
            anchor = await self.db.get(Session, starting_after)
            if anchor is None:
                return [], False
            stmt = (
                select(Session)
                .where(Session.user_id == user_id, col < anchor.created_at)
                .order_by(col.desc())
                .limit(limit + 1)
            )
        elif ending_before:
            anchor = await self.db.get(Session, ending_before)
            if anchor is None:
                return [], False
            stmt = (
                select(Session)
                .where(Session.user_id == user_id, col > anchor.created_at)
                .order_by(col.asc())
                .limit(limit + 1)
            )
        else:
            stmt = select(Session).where(Session.user_id == user_id).order_by(col.desc()).limit(limit + 1)

        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items = list(reversed(items))
        return items, has_more

    async def delete(self, session_id: str) -> bool:
        stmt = delete(Session).where(Session.id == session_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def delete_by_token_hash(self, token_hash: str) -> bool:
        stmt = delete(Session).where(Session.token_hash == token_hash)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def delete_all_for_user(self, user_id: str) -> int:
        """Revoke every session for a user (e.g. on ban). Returns rows deleted."""
        stmt = delete(Session).where(Session.user_id == user_id)
        result = await self.db.execute(stmt)
        return int(getattr(result, "rowcount", 0) or 0)
