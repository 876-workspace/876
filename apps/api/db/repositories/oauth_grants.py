import time
from typing import Any

from sqlalchemy import select, update

from db.models import OauthGrant
from db.repositories.base import BaseRepository


class OauthGrantRepository(BaseRepository):
    async def get_by_user_and_app(self, user_id: str, app_id: str) -> OauthGrant | None:
        stmt = select(OauthGrant).where(
            OauthGrant.user_id == user_id,
            OauthGrant.app_id == app_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def upsert(self, user_id: str, app_id: str, **kwargs: Any) -> OauthGrant:
        existing = await self.get_by_user_and_app(user_id, app_id)
        now = int(time.time())
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            existing.updated_at = now
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        grant = OauthGrant(user_id=user_id, app_id=app_id, **kwargs)
        self.db.add(grant)
        await self.db.flush()
        await self.db.refresh(grant)
        return grant

    async def list_for_user(self, user_id: str) -> list[OauthGrant]:
        stmt = select(OauthGrant).where(OauthGrant.user_id == user_id)
        return list((await self.db.scalars(stmt)).all())

    async def revoke(self, user_id: str, app_id: str) -> OauthGrant | None:
        now = int(time.time())
        stmt = (
            update(OauthGrant)
            .where(OauthGrant.user_id == user_id, OauthGrant.app_id == app_id)
            .values(revoked_at=now, updated_at=now)
            .returning(OauthGrant)
        )
        return (await self.db.scalars(stmt)).first()
