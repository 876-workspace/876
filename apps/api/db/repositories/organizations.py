from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, or_, select, update
from sqlalchemy.sql.elements import ColumnElement

from core.deletion import deletion_values
from db.models import Organization
from db.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository):
    async def get_by_id(self, org_id: str, include_deleted: bool = False) -> Organization | None:
        org = await self.db.get(Organization, org_id)
        if org is None:
            return None
        if not include_deleted and org.deleted_at is not None:
            return None
        return org

    async def get_by_slug(self, slug: str, include_deleted: bool = False) -> Organization | None:
        stmt = select(Organization).where(Organization.slug == slug)
        if not include_deleted:
            stmt = stmt.where(Organization.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_workos_id(self, workos_org_id: str) -> Organization | None:
        stmt = select(Organization).where(
            Organization.workos_organization_id == workos_org_id,
            Organization.deleted_at.is_(None),
        )
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> Organization:
        org = Organization(**kwargs)
        self.db.add(org)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def update(self, org_id: str, **kwargs: Any) -> Organization | None:
        stmt = update(Organization).where(Organization.id == org_id).values(**kwargs).returning(Organization)
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        org_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(Organization)
            .where(Organization.id == org_id, Organization.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, org_id: str) -> bool:
        stmt = delete(Organization).where(Organization.id == org_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> tuple[Sequence[Organization], bool]:
        filters: list[ColumnElement[bool]] = (
            [] if include_deleted else [Organization.deleted_at.is_(None)]
        )
        if status:
            filters.append(Organization.status == status)
        return await self.cursor_paginate_filtered(
            Organization,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    async def search(
        self,
        query: str,
        limit: int = 20,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> Sequence[Organization]:
        pattern = f"%{query}%"
        stmt = select(Organization).where(
            or_(Organization.name.ilike(pattern), Organization.slug.ilike(pattern)),
        )
        if not include_deleted:
            stmt = stmt.where(Organization.deleted_at.is_(None))
        if status:
            stmt = stmt.where(Organization.status == status)
        stmt = stmt.order_by(Organization.created_at.desc()).limit(limit)
        return list((await self.db.scalars(stmt)).all())
