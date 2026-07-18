from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models.billing_accounts import BillingAccount


class BillingAccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(
        self,
        *,
        organization_id: str | None = None,
        limit: int = 25,
    ) -> list[BillingAccount]:
        stmt = select(BillingAccount).order_by(BillingAccount.created_at.desc()).limit(limit)
        if organization_id:
            stmt = stmt.where(BillingAccount.organization_id == organization_id)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, account_id: str) -> BillingAccount | None:
        stmt = select(BillingAccount).where(BillingAccount.id == account_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_organization_id(self, organization_id: str) -> BillingAccount | None:
        stmt = select(BillingAccount).where(BillingAccount.organization_id == organization_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, **kwargs: Any) -> BillingAccount:
        now = now_unix_seconds()
        account = BillingAccount(
            id=kwargs.pop("id", generate_id("billingAccount")),
            **kwargs,
            created_at=kwargs.get("created_at", now),
            updated_at=kwargs.get("updated_at", now),
        )
        self.session.add(account)
        await self.session.flush()
        return account

    async def update(self, account_id: str, **kwargs: Any) -> BillingAccount | None:
        account = await self.get_by_id(account_id)
        if not account:
            return None

        kwargs["updated_at"] = now_unix_seconds()
        for key, value in kwargs.items():
            setattr(account, key, value)

        await self.session.flush()
        return account
