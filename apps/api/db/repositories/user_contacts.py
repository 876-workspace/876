from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.orm import joinedload

from core.deletion import deletion_values, should_soft_delete
from db.models import Contact
from db.repositories.base import BaseRepository


class UserContactRepository(BaseRepository):
    async def get_by_id_for_owner(self, contact_id: str, owner_user_id: str) -> Contact | None:
        stmt = (
            select(Contact)
            .where(Contact.id == contact_id, Contact.owner_user_id == owner_user_id, Contact.deleted_at.is_(None))
            .options(joinedload(Contact.contact_user))
        )
        return (await self.db.scalars(stmt)).first()

    async def get_by_pair(self, owner_user_id: str, contact_user_id: str) -> Contact | None:
        stmt = select(Contact).where(
            Contact.owner_user_id == owner_user_id,
            Contact.contact_user_id == contact_user_id,
            Contact.deleted_at.is_(None),
        )
        return (await self.db.scalars(stmt)).first()

    async def list_by_owner(self, owner_user_id: str, include_deleted: bool = False) -> list[Contact]:
        stmt = (
            select(Contact)
            .where(Contact.owner_user_id == owner_user_id)
            .options(joinedload(Contact.contact_user))
            .order_by(Contact.created_at.desc())
        )
        if not include_deleted:
            stmt = stmt.where(Contact.deleted_at.is_(None))
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> Contact:
        contact = Contact(**kwargs)
        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)
        return contact

    async def update_for_owner(
        self,
        contact_id: str,
        owner_user_id: str,
        **kwargs: Any,
    ) -> Contact | None:
        stmt = (
            update(Contact)
            .where(Contact.id == contact_id, Contact.owner_user_id == owner_user_id, Contact.deleted_at.is_(None))
            .values(**kwargs)
            .returning(Contact)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_for_owner(
        self,
        contact_id: str,
        owner_user_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(Contact)
                .where(Contact.id == contact_id, Contact.owner_user_id == owner_user_id, Contact.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(Contact).where(
                Contact.id == contact_id,
                Contact.owner_user_id == owner_user_id,
            )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)
