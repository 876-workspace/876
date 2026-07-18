from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload

from core.id import generate_id
from db.models import AppAssignment
from db.repositories.base import BaseRepository


class AppAssignmentRepository(BaseRepository):
    async def get_by_id(self, assignment_id: str) -> AppAssignment | None:
        stmt = (
            select(AppAssignment)
            .options(selectinload(AppAssignment.app))
            .where(AppAssignment.id == assignment_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def get_for_member(
        self, organization_id: str, user_id: str, app_id: str
    ) -> AppAssignment | None:
        stmt = select(AppAssignment).where(
            AppAssignment.organization_id == organization_id,
            AppAssignment.user_id == user_id,
            AppAssignment.app_id == app_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def list_by_org(
        self,
        organization_id: str,
        *,
        user_id: str | None = None,
        app_id: str | None = None,
        include_revoked: bool = False,
    ) -> Sequence[AppAssignment]:
        stmt = (
            select(AppAssignment)
            .options(selectinload(AppAssignment.app))
            .where(AppAssignment.organization_id == organization_id)
        )
        if user_id:
            stmt = stmt.where(AppAssignment.user_id == user_id)
        if app_id:
            stmt = stmt.where(AppAssignment.app_id == app_id)
        if not include_revoked:
            stmt = stmt.where(AppAssignment.status == "active")
        stmt = stmt.order_by(AppAssignment.created_at.asc())
        return list((await self.db.scalars(stmt)).all())

    async def assign(
        self,
        organization_id: str,
        user_id: str,
        app_id: str,
        now: int,
        *,
        assigned_by: str | None = None,
    ) -> AppAssignment:
        """Upsert an active assignment (reactivates a revoked one)."""
        stmt = (
            pg_insert(AppAssignment)
            .values(
                id=generate_id("appAssignment"),
                organization_id=organization_id,
                user_id=user_id,
                app_id=app_id,
                status="active",
                assigned_by=assigned_by,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["organization_id", "user_id", "app_id"],
                set_={"status": "active", "assigned_by": assigned_by, "updated_at": now},
            )
            .returning(AppAssignment)
        )
        result = (await self.db.scalars(stmt)).one()
        await self.db.flush()
        return result

    async def revoke(self, assignment_id: str, now: int) -> AppAssignment | None:
        assignment = await self.get_by_id(assignment_id)
        if assignment is None or assignment.status == "revoked":
            return None

        assignment.status = "revoked"
        assignment.updated_at = now
        await self.db.flush()
        return assignment
