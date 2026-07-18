from typing import Any

from sqlalchemy import delete, select, update

from db.models import Address
from db.repositories.base import BaseRepository


class AddressRepository(BaseRepository):
    async def get_by_id(self, address_id: str) -> Address | None:
        return await self.db.get(Address, address_id)

    async def get_by_id_for_user(self, address_id: str, user_id: str) -> Address | None:
        stmt = select(Address).where(Address.id == address_id, Address.user_id == user_id)
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> Address:
        addr = Address(**kwargs)
        self.db.add(addr)
        await self.db.flush()
        await self.db.refresh(addr)
        return addr

    async def update(self, address_id: str, **kwargs: Any) -> Address | None:
        stmt = update(Address).where(Address.id == address_id).values(**kwargs).returning(Address)
        return (await self.db.scalars(stmt)).first()

    async def update_for_user(self, address_id: str, user_id: str, **kwargs: Any) -> Address | None:
        stmt = (
            update(Address)
            .where(Address.id == address_id, Address.user_id == user_id)
            .values(**kwargs)
            .returning(Address)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(self, address_id: str) -> bool:
        stmt = delete(Address).where(Address.id == address_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def delete_for_user(self, address_id: str, user_id: str) -> bool:
        stmt = delete(Address).where(Address.id == address_id, Address.user_id == user_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_by_user(self, user_id: str) -> list[Address]:
        stmt = select(Address).where(Address.user_id == user_id).order_by(Address.created_at.desc())
        return list((await self.db.scalars(stmt)).all())

    async def list_by_org(self, organization_id: str) -> list[Address]:
        stmt = select(Address).where(Address.organization_id == organization_id).order_by(Address.created_at.desc())
        return list((await self.db.scalars(stmt)).all())
