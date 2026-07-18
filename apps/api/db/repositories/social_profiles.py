from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values, should_soft_delete
from db.models import SocialPlatform, UserSocialProfile
from db.repositories.base import BaseRepository


class SocialPlatformRepository(BaseRepository):
    async def get_by_id(self, platform_id: str) -> SocialPlatform | None:
        return await self.db.get(SocialPlatform, platform_id)

    async def get_by_slug(self, slug: str) -> SocialPlatform | None:
        stmt = select(SocialPlatform).where(SocialPlatform.slug == slug)
        return (await self.db.scalars(stmt)).first()

    async def list(self, enabled_only: bool = False) -> list[SocialPlatform]:
        stmt = select(SocialPlatform).order_by(SocialPlatform.sort_order.asc(), SocialPlatform.name.asc())
        if enabled_only:
            stmt = stmt.where(SocialPlatform.is_enabled == True)  # noqa: E712
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> SocialPlatform:
        platform = SocialPlatform(**kwargs)
        self.db.add(platform)
        await self.db.flush()
        await self.db.refresh(platform)
        return platform

    async def update(self, platform_id: str, **kwargs: Any) -> SocialPlatform | None:
        stmt = update(SocialPlatform).where(SocialPlatform.id == platform_id).values(**kwargs).returning(SocialPlatform)
        return (await self.db.scalars(stmt)).first()


class UserSocialProfileRepository(BaseRepository):
    async def get_by_id(self, profile_id: str) -> UserSocialProfile | None:
        return await self.db.get(UserSocialProfile, profile_id)

    async def list_for_user(self, user_id: str, include_deleted: bool = False) -> list[UserSocialProfile]:
        stmt = select(UserSocialProfile).where(UserSocialProfile.user_id == user_id)
        if not include_deleted:
            stmt = stmt.where(UserSocialProfile.deleted_at.is_(None))
        stmt = stmt.order_by(UserSocialProfile.created_at.desc())
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> UserSocialProfile:
        profile = UserSocialProfile(**kwargs)
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile_id: str, **kwargs: Any) -> UserSocialProfile | None:
        stmt = (
            update(UserSocialProfile)
            .where(UserSocialProfile.id == profile_id)
            .values(**kwargs)
            .returning(UserSocialProfile)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(self, profile_id: str, deleted_by: str | None = None, reason: str | None = None) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(UserSocialProfile)
                .where(UserSocialProfile.id == profile_id)
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(UserSocialProfile).where(UserSocialProfile.id == profile_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)
