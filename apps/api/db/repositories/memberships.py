from typing import Any

from sqlalchemy import delete, func, select, update

from core.deletion import deletion_values, should_soft_delete
from db.models import Membership, Organization
from db.repositories.base import BaseRepository


class MembershipRepository(BaseRepository):
    async def get_by_id(self, membership_id: str) -> Membership | None:
        membership = await self.db.get(Membership, membership_id)
        return membership if membership is None or membership.deleted_at is None else None

    async def companies_for_users(self, user_ids: list[str]) -> dict[str, tuple[str, str | None, str | None]]:
        """Map each user id to (org_name, org_short_name, logo_url) for their primary organization.

        Batched to avoid an N+1 when rendering a page of users; users without a
        membership are simply absent from the returned map.
        """
        if not user_ids:
            return {}

        stmt = (
            select(Membership.user_id, Organization.name, Organization.short_name, Organization.logo_url)
            .join(Organization, Organization.id == Membership.organization_id)
            .where(Membership.user_id.in_(user_ids))
            .where(Membership.deleted_at.is_(None))
            .order_by(Membership.created_at.asc())
        )
        result = await self.db.execute(stmt)

        companies: dict[str, tuple[str, str | None, str | None]] = {}
        for user_id, name, short_name, logo_url in result.all():
            companies.setdefault(user_id, (name, short_name, logo_url))
        return companies

    async def count_for_org(self, org_id: str) -> int:
        """Count non-deleted memberships in an organization (any status)."""
        stmt = (
            select(func.count())
            .select_from(Membership)
            .where(Membership.organization_id == org_id, Membership.deleted_at.is_(None))
        )
        return int((await self.db.scalar(stmt)) or 0)

    async def get_by_org_and_user(self, org_id: str, user_id: str) -> Membership | None:
        stmt = select(Membership).where(
            Membership.organization_id == org_id,
            Membership.user_id == user_id,
            Membership.deleted_at.is_(None),
        )
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> Membership:
        membership = Membership(**kwargs)
        self.db.add(membership)
        await self.db.flush()
        await self.db.refresh(membership)
        return membership

    async def update(self, membership_id: str, **kwargs: Any) -> Membership | None:
        stmt = update(Membership).where(Membership.id == membership_id).values(**kwargs).returning(Membership)
        return (await self.db.scalars(stmt)).first()

    async def delete(self, membership_id: str, deleted_by: str | None = None, reason: str | None = None) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(Membership)
                .where(Membership.id == membership_id, Membership.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(Membership).where(Membership.id == membership_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        org_id: str | None = None,
        user_id: str | None = None,
    ) -> tuple[list[Membership], bool]:
        filters: list[Any] = [Membership.deleted_at.is_(None)]
        if org_id:
            filters.append(Membership.organization_id == org_id)
        if user_id:
            filters.append(Membership.user_id == user_id)

        if not filters:
            return await self.cursor_paginate(
                Membership,
                cursor_field="created_at",
                limit=limit,
                starting_after=starting_after,
                ending_before=ending_before,
            )

        col = Membership.created_at
        stmt = select(Membership).where(*filters).order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more
