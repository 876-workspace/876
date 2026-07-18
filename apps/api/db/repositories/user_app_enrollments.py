from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from core.id import generate_id
from db.models import UserAppEnrollment
from db.repositories.base import BaseRepository


class UserAppEnrollmentRepository(BaseRepository):
    async def upsert(self, user_id: str, app_id: str, now: int) -> None:
        stmt = (
            pg_insert(UserAppEnrollment)
            .values(
                id=generate_id("userAppEnrollment"),
                user_id=user_id,
                app_id=app_id,
                enrolled_at=now,
                last_seen_at=now,
            )
            .on_conflict_do_update(
                index_elements=["user_id", "app_id"],
                set_={"last_seen_at": now},
            )
        )
        await self.db.execute(stmt)

    async def list_for_user(self, user_id: str) -> list[UserAppEnrollment]:
        from sqlalchemy.orm import joinedload

        stmt = (
            select(UserAppEnrollment)
            .options(joinedload(UserAppEnrollment.app))
            .where(UserAppEnrollment.user_id == user_id)
            .order_by(UserAppEnrollment.enrolled_at.asc())
        )
        return list((await self.db.scalars(stmt)).unique().all())
