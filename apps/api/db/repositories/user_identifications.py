from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values, should_soft_delete
from db.models import UserIdentification
from db.repositories.base import BaseRepository


class UserIdentificationRepository(BaseRepository):
    async def get_by_type(
        self,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> UserIdentification | None:
        stmt = select(UserIdentification).where(
            UserIdentification.user_id == user_id,
            UserIdentification.type == identification_type,
        )
        if not include_deleted:
            stmt = stmt.where(UserIdentification.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def list_by_user(self, user_id: str, include_deleted: bool = False) -> list[UserIdentification]:
        stmt = select(UserIdentification).where(UserIdentification.user_id == user_id)
        if not include_deleted:
            stmt = stmt.where(UserIdentification.deleted_at.is_(None))
        stmt = stmt.order_by(UserIdentification.created_at.asc())
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> UserIdentification:
        row = UserIdentification(**kwargs)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def update_value(self, identification_id: str, **kwargs: Any) -> UserIdentification | None:
        stmt = (
            update(UserIdentification)
            .where(UserIdentification.id == identification_id, UserIdentification.deleted_at.is_(None))
            .values(**kwargs)
            .returning(UserIdentification)
        )
        return (await self.db.scalars(stmt)).first()

    async def set_verified(
        self,
        identification_id: str,
        *,
        verified_by: str,
        verified_at: int,
        updated_at: int,
    ) -> UserIdentification | None:
        stmt = (
            update(UserIdentification)
            .where(UserIdentification.id == identification_id, UserIdentification.deleted_at.is_(None))
            .values(verified=True, verified_by=verified_by, verified_at=verified_at, updated_at=updated_at)
            .returning(UserIdentification)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        identification_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(UserIdentification)
                .where(UserIdentification.id == identification_id, UserIdentification.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(UserIdentification).where(UserIdentification.id == identification_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)
