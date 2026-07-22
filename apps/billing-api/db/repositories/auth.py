from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AppFinanceConnection, Member, Role, Tenant
from db.models.generated.enums import AppFinanceConnectionStatus, MemberStatus
from db.repositories.base import Repository


@dataclass(frozen=True)
class MemberAuthorization:
    user_id: str
    permissions: frozenset[str]


class AuthRepository(Repository[Tenant]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def tenant_by_organization_id(self, organization_id: str) -> Tenant | None:
        statement = select(Tenant).where(Tenant.organization_id == organization_id)
        return (await self.session.scalars(statement)).first()

    async def active_connection(self, tenant_id: str, app_id: str) -> AppFinanceConnection | None:
        statement = select(AppFinanceConnection).where(
            AppFinanceConnection.tenant_id == tenant_id,
            AppFinanceConnection.source_app_id == app_id,
            AppFinanceConnection.status == AppFinanceConnectionStatus.ACTIVE,
        )
        return (await self.session.scalars(statement)).first()

    async def active_member(self, tenant_id: str, user_id: str) -> MemberAuthorization | None:
        statement = (
            select(Member.user_id, Role.permissions)
            .join(Role, (Role.tenant_id == Member.tenant_id) & (Role.id == Member.role_id))
            .where(
                Member.tenant_id == tenant_id,
                Member.user_id == user_id,
                Member.status == MemberStatus.ACTIVE,
            )
        )
        row = (await self.session.execute(statement)).first()
        if row is None:
            return None
        return MemberAuthorization(user_id=row.user_id, permissions=frozenset(row.permissions or []))
