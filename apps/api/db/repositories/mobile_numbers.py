from __future__ import annotations

from typing import Any

from sqlalchemy import select, update

from db.models import UserMobileNumber, Verification
from db.repositories.base import BaseRepository


class MobileNumberRepository(BaseRepository):
    """Persistence operations for the authenticated user's phone numbers."""

    async def create(self, **kwargs: Any) -> UserMobileNumber:
        row = UserMobileNumber(**kwargs)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def get(self, *, user_id: str, mobile_number_id: str) -> UserMobileNumber | None:
        statement = select(UserMobileNumber).where(
            UserMobileNumber.id == mobile_number_id,
            UserMobileNumber.user_id == user_id,
        )
        return (await self.db.scalars(statement)).first()

    async def get_by_number(self, *, user_id: str, number: str) -> UserMobileNumber | None:
        statement = select(UserMobileNumber).where(
            UserMobileNumber.user_id == user_id,
            UserMobileNumber.number == number,
        )
        return (await self.db.scalars(statement)).first()

    async def list(self, *, user_id: str) -> list[UserMobileNumber]:
        statement = select(UserMobileNumber).where(UserMobileNumber.user_id == user_id).order_by(
            UserMobileNumber.is_primary.desc(),
            UserMobileNumber.created_at.desc(),
        )
        return list((await self.db.scalars(statement)).all())

    async def update(self, row: UserMobileNumber, **values: Any) -> UserMobileNumber:
        for name, value in values.items():
            setattr(row, name, value)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def delete(self, row: UserMobileNumber) -> None:
        await self.db.delete(row)
        await self.db.flush()

    async def clear_primary(self, *, user_id: str) -> None:
        await self.db.execute(
            update(UserMobileNumber)
            .where(UserMobileNumber.user_id == user_id, UserMobileNumber.is_primary.is_(True))
            .values(is_primary=False)
        )
        await self.db.flush()

    async def get_verification(self, *, verification_id: str) -> Verification | None:
        return await self.db.get(Verification, verification_id)

    async def create_verification(self, **kwargs: Any) -> Verification:
        row = Verification(**kwargs)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row
