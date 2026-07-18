import time
from typing import Any

from sqlalchemy import delete, select

from db.models import UserFeature
from db.repositories.base import BaseRepository


class UserFeatureRepository(BaseRepository):
    async def get_by_user_and_feature(self, user_id: str, feature_id: str) -> UserFeature | None:
        stmt = select(UserFeature).where(
            UserFeature.user_id == user_id,
            UserFeature.feature_id == feature_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def upsert(self, user_id: str, feature_id: str, **kwargs: Any) -> UserFeature:
        existing = await self.get_by_user_and_feature(user_id, feature_id)
        now = int(time.time())
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            existing.updated_at = now
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        uf = UserFeature(user_id=user_id, feature_id=feature_id, **kwargs)
        self.db.add(uf)
        await self.db.flush()
        await self.db.refresh(uf)
        return uf

    async def delete(self, user_id: str, feature_id: str) -> bool:
        stmt = delete(UserFeature).where(
            UserFeature.user_id == user_id,
            UserFeature.feature_id == feature_id,
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_for_user(self, user_id: str) -> list[UserFeature]:
        stmt = select(UserFeature).where(UserFeature.user_id == user_id)
        return list((await self.db.scalars(stmt)).all())
