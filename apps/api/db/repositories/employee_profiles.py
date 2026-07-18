from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload

from core.deletion import deletion_values
from db.models import EmployeeProfile
from db.repositories.base import BaseRepository


def _with_membership(stmt: Any) -> Any:
    return stmt.options(selectinload(EmployeeProfile.membership))


class EmployeeProfileRepository(BaseRepository):
    async def get_by_id(self, profile_id: str, include_deleted: bool = False) -> EmployeeProfile | None:
        stmt = _with_membership(select(EmployeeProfile).where(EmployeeProfile.id == profile_id))
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_membership(
        self, membership_id: str, include_deleted: bool = False
    ) -> EmployeeProfile | None:
        stmt = _with_membership(
            select(EmployeeProfile).where(EmployeeProfile.membership_id == membership_id)
        )
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_id_for_org(
        self, profile_id: str, organization_id: str, include_deleted: bool = False
    ) -> EmployeeProfile | None:
        stmt = _with_membership(
            select(EmployeeProfile).where(
                EmployeeProfile.id == profile_id, EmployeeProfile.organization_id == organization_id
            )
        )
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> EmployeeProfile:
        profile = EmployeeProfile(**kwargs)
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile_id: str, **kwargs: Any) -> EmployeeProfile | None:
        stmt = (
            update(EmployeeProfile)
            .where(EmployeeProfile.id == profile_id, EmployeeProfile.deleted_at.is_(None))
            .values(**kwargs)
            .returning(EmployeeProfile)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(
        self,
        profile_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(EmployeeProfile)
            .where(EmployeeProfile.id == profile_id, EmployeeProfile.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, profile_id: str) -> bool:
        stmt = delete(EmployeeProfile).where(EmployeeProfile.id == profile_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_by_org(
        self, organization_id: str, include_deleted: bool = False
    ) -> Sequence[EmployeeProfile]:
        stmt = _with_membership(
            select(EmployeeProfile).where(EmployeeProfile.organization_id == organization_id)
        )
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        stmt = stmt.order_by(EmployeeProfile.created_at.asc())
        return list((await self.db.scalars(stmt)).all())

    async def list_by_department(
        self, department_id: str, include_deleted: bool = False
    ) -> Sequence[EmployeeProfile]:
        stmt = _with_membership(
            select(EmployeeProfile).where(EmployeeProfile.department_id == department_id)
        )
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        stmt = stmt.order_by(EmployeeProfile.created_at.asc())
        return list((await self.db.scalars(stmt)).all())

    async def list_by_manager(
        self, manager_membership_id: str, include_deleted: bool = False
    ) -> Sequence[EmployeeProfile]:
        stmt = _with_membership(
            select(EmployeeProfile).where(
                EmployeeProfile.manager_membership_id == manager_membership_id
            )
        )
        if not include_deleted:
            stmt = stmt.where(EmployeeProfile.deleted_at.is_(None))
        stmt = stmt.order_by(EmployeeProfile.created_at.asc())
        return list((await self.db.scalars(stmt)).all())
