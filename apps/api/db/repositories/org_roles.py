from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, func, select, update

from core.id import generate_id
from core.org_permissions import DEFAULT_ORG_ROLES
from db.models import Membership, OrganizationRole
from db.repositories.base import BaseRepository


class OrganizationRoleRepository(BaseRepository):
    async def get_by_id(self, role_id: str) -> OrganizationRole | None:
        return await self.db.get(OrganizationRole, role_id)

    async def get_by_id_for_org(self, role_id: str, organization_id: str) -> OrganizationRole | None:
        stmt = select(OrganizationRole).where(
            OrganizationRole.id == role_id,
            OrganizationRole.organization_id == organization_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def get_by_name(self, organization_id: str, name: str) -> OrganizationRole | None:
        stmt = select(OrganizationRole).where(
            OrganizationRole.organization_id == organization_id,
            OrganizationRole.name == name,
        )
        return (await self.db.scalars(stmt)).first()

    async def list_by_org(self, organization_id: str) -> Sequence[OrganizationRole]:
        stmt = (
            select(OrganizationRole)
            .where(OrganizationRole.organization_id == organization_id)
            .order_by(OrganizationRole.is_system.desc(), OrganizationRole.created_at.asc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> OrganizationRole:
        role = OrganizationRole(**kwargs)
        self.db.add(role)
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def update(self, role_id: str, **kwargs: Any) -> OrganizationRole | None:
        stmt = (
            update(OrganizationRole)
            .where(OrganizationRole.id == role_id)
            .values(**kwargs)
            .returning(OrganizationRole)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete(self, role_id: str) -> bool:
        stmt = delete(OrganizationRole).where(OrganizationRole.id == role_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def count_memberships(self, role_id: str) -> int:
        stmt = select(func.count()).select_from(Membership).where(Membership.role_id == role_id)
        return int((await self.db.execute(stmt)).scalar_one())

    async def seed_defaults(self, organization_id: str, now: int) -> dict[str, OrganizationRole]:
        """Idempotently seed the default system roles for an organization.

        Returns the org's system roles keyed by role name (existing rows are
        kept as-is so org-visible role state never regresses on re-seed).
        """
        existing = {role.name: role for role in await self.list_by_org(organization_id)}
        seeded: dict[str, OrganizationRole] = {}

        for definition in DEFAULT_ORG_ROLES:
            current = existing.get(definition.name)
            if current is not None:
                seeded[definition.name] = current
                continue

            seeded[definition.name] = await self.create(
                id=generate_id("role"),
                organization_id=organization_id,
                name=definition.name,
                display_name=definition.display_name,
                description=definition.description,
                permissions=list(definition.permissions),
                is_system=True,
                created_at=now,
                updated_at=now,
            )

        return seeded
