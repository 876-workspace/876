from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values
from db.models import OrgLocation
from db.repositories.base import BaseRepository


class OrgLocationRepository(BaseRepository):
    async def get_by_id(self, location_id: str, include_deleted: bool = False) -> OrgLocation | None:
        location = await self.db.get(OrgLocation, location_id)
        if location is None:
            return None
        if not include_deleted and location.deleted_at is not None:
            return None
        return location

    async def get_by_id_for_org(
        self, location_id: str, organization_id: str, include_deleted: bool = False
    ) -> OrgLocation | None:
        stmt = select(OrgLocation).where(
            OrgLocation.id == location_id, OrgLocation.organization_id == organization_id
        )
        if not include_deleted:
            stmt = stmt.where(OrgLocation.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> OrgLocation:
        location = OrgLocation(**kwargs)
        self.db.add(location)
        await self.db.flush()
        await self.db.refresh(location)
        return location

    async def update(self, location_id: str, **kwargs: Any) -> OrgLocation | None:
        stmt = (
            update(OrgLocation)
            .where(OrgLocation.id == location_id, OrgLocation.deleted_at.is_(None))
            .values(**kwargs)
            .returning(OrgLocation)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        location_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(OrgLocation)
            .where(OrgLocation.id == location_id, OrgLocation.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, location_id: str) -> bool:
        stmt = delete(OrgLocation).where(OrgLocation.id == location_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def clear_primary_for_org(self, organization_id: str) -> None:
        stmt = (
            update(OrgLocation)
            .where(OrgLocation.organization_id == organization_id, OrgLocation.is_primary.is_(True))
            .values(is_primary=False)
        )
        await self.db.execute(stmt)

    async def list_by_org(
        self, organization_id: str, include_deleted: bool = False
    ) -> Sequence[OrgLocation]:
        stmt = select(OrgLocation).where(OrgLocation.organization_id == organization_id)
        if not include_deleted:
            stmt = stmt.where(OrgLocation.deleted_at.is_(None))
        stmt = stmt.order_by(OrgLocation.is_primary.desc(), OrgLocation.created_at.asc())
        return list((await self.db.scalars(stmt)).all())
