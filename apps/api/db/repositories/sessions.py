import time
from typing import Any

from sqlalchemy import ColumnElement, delete, select, update

from core.timestamps import now_unix_seconds
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

    async def list(
        self,
        *,
        limit: int = 25,
        starting_after: str | None = None,
        ending_before: str | None = None,
        user_id: str | None = None,
        device_id: str | None = None,
        active: bool | None = None,
    ) -> tuple[list[Session], bool]:
        """Newest-first session list for the admin surface.

        ``active`` means unexpired **and** unrevoked — a revoked row keeps its
        future ``expires_at``, so expiry alone is not the liveness test.
        """
        filters: list[ColumnElement[bool]] = []
        if user_id is not None:
            filters.append(Session.user_id == user_id)
        if device_id is not None:
            filters.append(Session.device_id == device_id)
        if active is not None:
            now = int(time.time())
            if active:
                filters.append(Session.expires_at > now)
                filters.append(Session.revoked_at.is_(None))
            else:
                filters.append((Session.expires_at <= now) | (Session.revoked_at.is_not(None)))

        return await self.cursor_paginate_filtered(
            Session,
            filters,
            "created_at",
            limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    async def revoke(self, session_id: str, revoked_by: str | None = None) -> Session | None:
        """Marks a session revoked without deleting it.

        The row is kept so Console can still show where and on what device the
        session was established after it has been cut off — deleting it would
        erase exactly the evidence an investigation needs.
        """
        row = await self.db.get(Session, session_id)
        if row is None:
            return None

        now = now_unix_seconds()
        row.revoked_at = now
        row.revoked_by = revoked_by
        row.expires_at = min(row.expires_at, now)
        row.updated_at = now
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def touch_last_seen(self, session_id: str) -> None:
        row = await self.db.get(Session, session_id)
        if row is None:
            return

        row.last_seen_at = now_unix_seconds()
        await self.db.flush()

    async def revoke_all_for_user(self, user_id: str, revoked_by: str | None = None) -> int:
        now = now_unix_seconds()
        result = await self.db.execute(
            update(Session)
            .where(Session.user_id == user_id, Session.revoked_at.is_(None))
            .values(revoked_at=now, revoked_by=revoked_by, expires_at=now, updated_at=now)
        )
        return int(getattr(result, "rowcount", 0) or 0)

    async def delete_all_for_user(self, user_id: str) -> int:
        """Revoke every session for a user (e.g. on ban). Returns rows deleted."""
        stmt = delete(Session).where(Session.user_id == user_id)
        result = await self.db.execute(stmt)
        return int(getattr(result, "rowcount", 0) or 0)
