from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values
from db.models import OrgDepartment
from db.repositories.base import BaseRepository


class OrgDepartmentRepository(BaseRepository):
    async def get_by_id(self, department_id: str, include_deleted: bool = False) -> OrgDepartment | None:
        department = await self.db.get(OrgDepartment, department_id)
        if department is None:
            return None
        if not include_deleted and department.deleted_at is not None:
            return None
        return department

    async def get_by_id_for_org(
        self, department_id: str, organization_id: str, include_deleted: bool = False
    ) -> OrgDepartment | None:
        stmt = select(OrgDepartment).where(
            OrgDepartment.id == department_id, OrgDepartment.organization_id == organization_id
        )
        if not include_deleted:
            stmt = stmt.where(OrgDepartment.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> OrgDepartment:
        department = OrgDepartment(**kwargs)
        self.db.add(department)
        await self.db.flush()
        await self.db.refresh(department)
        return department

    async def update(self, department_id: str, **kwargs: Any) -> OrgDepartment | None:
        stmt = (
            update(OrgDepartment)
            .where(OrgDepartment.id == department_id, OrgDepartment.deleted_at.is_(None))
            .values(**kwargs)
            .returning(OrgDepartment)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        department_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(OrgDepartment)
            .where(OrgDepartment.id == department_id, OrgDepartment.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, department_id: str) -> bool:
        stmt = delete(OrgDepartment).where(OrgDepartment.id == department_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_by_org(
        self, organization_id: str, include_deleted: bool = False
    ) -> Sequence[OrgDepartment]:
        stmt = select(OrgDepartment).where(OrgDepartment.organization_id == organization_id)
        if not include_deleted:
            stmt = stmt.where(OrgDepartment.deleted_at.is_(None))
        stmt = stmt.order_by(OrgDepartment.name.asc())
        return list((await self.db.scalars(stmt)).all())

    async def list_children(
        self, department_id: str, include_deleted: bool = False
    ) -> Sequence[OrgDepartment]:
        stmt = select(OrgDepartment).where(OrgDepartment.parent_department_id == department_id)
        if not include_deleted:
            stmt = stmt.where(OrgDepartment.deleted_at.is_(None))
        stmt = stmt.order_by(OrgDepartment.name.asc())
        return list((await self.db.scalars(stmt)).all())
