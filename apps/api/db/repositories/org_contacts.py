from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values
from db.models import OrgContact
from db.repositories.base import BaseRepository


class OrgContactRepository(BaseRepository):
    async def get_by_id(self, contact_id: str, include_deleted: bool = False) -> OrgContact | None:
        contact = await self.db.get(OrgContact, contact_id)
        if contact is None:
            return None
        if not include_deleted and contact.deleted_at is not None:
            return None
        return contact

    async def get_by_id_for_org(
        self, contact_id: str, organization_id: str, include_deleted: bool = False
    ) -> OrgContact | None:
        stmt = select(OrgContact).where(
            OrgContact.id == contact_id, OrgContact.organization_id == organization_id
        )
        if not include_deleted:
            stmt = stmt.where(OrgContact.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> OrgContact:
        contact = OrgContact(**kwargs)
        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)
        return contact

    async def update(self, contact_id: str, **kwargs: Any) -> OrgContact | None:
        stmt = (
            update(OrgContact)
            .where(OrgContact.id == contact_id, OrgContact.deleted_at.is_(None))
            .values(**kwargs)
            .returning(OrgContact)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        contact_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(OrgContact)
            .where(OrgContact.id == contact_id, OrgContact.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, contact_id: str) -> bool:
        stmt = delete(OrgContact).where(OrgContact.id == contact_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def clear_primary_for_org(self, organization_id: str) -> None:
        stmt = (
            update(OrgContact)
            .where(OrgContact.organization_id == organization_id, OrgContact.is_primary.is_(True))
            .values(is_primary=False)
        )
        await self.db.execute(stmt)

    async def list_by_org(
        self, organization_id: str, include_deleted: bool = False
    ) -> Sequence[OrgContact]:
        stmt = select(OrgContact).where(OrgContact.organization_id == organization_id)
        if not include_deleted:
            stmt = stmt.where(OrgContact.deleted_at.is_(None))
        stmt = stmt.order_by(OrgContact.is_primary.desc(), OrgContact.created_at.asc())
        return list((await self.db.scalars(stmt)).all())
