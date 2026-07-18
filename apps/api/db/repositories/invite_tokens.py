from typing import Any

from sqlalchemy import delete, select, update

from db.models import InviteToken
from db.repositories.base import BaseRepository


class InviteTokenRepository(BaseRepository):
    async def get_by_id(self, token_id: str) -> InviteToken | None:
        return await self.db.get(InviteToken, token_id)

    async def get_by_token(self, token: str) -> InviteToken | None:
        stmt = select(InviteToken).where(InviteToken.token == token)
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> InviteToken:
        invite = InviteToken(**kwargs)
        self.db.add(invite)
        await self.db.flush()
        await self.db.refresh(invite)
        return invite

    async def update(self, token_id: str, **kwargs: Any) -> InviteToken | None:
        stmt = update(InviteToken).where(InviteToken.id == token_id).values(**kwargs).returning(InviteToken)
        return (await self.db.scalars(stmt)).first()

    async def delete(self, token_id: str) -> bool:
        stmt = delete(InviteToken).where(InviteToken.id == token_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_by_org(
        self,
        org_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[InviteToken], bool]:
        col = InviteToken.created_at
        stmt = (
            select(InviteToken)
            .where(InviteToken.organization_id == org_id)
            .order_by(col.desc())
            .limit(limit + 1)
        )
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more
