from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.timestamps import now_unix_seconds
from db.models.billing_provider_objects import BillingProviderObject


class BillingProviderObjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_provider_object(
        self,
        provider: str,
        provider_object_type: str,
        provider_object_id: str,
    ) -> BillingProviderObject | None:
        stmt = select(BillingProviderObject).where(
            BillingProviderObject.provider == provider,
            BillingProviderObject.provider_object_type == provider_object_type,
            BillingProviderObject.provider_object_id == provider_object_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_internal_object(
        self,
        internal_object_type: str,
        internal_object_id: str,
        provider: str | None = None,
    ) -> BillingProviderObject | None:
        stmt = select(BillingProviderObject).where(
            BillingProviderObject.internal_object_type == internal_object_type,
            BillingProviderObject.internal_object_id == internal_object_id,
        )
        if provider:
            stmt = stmt.where(BillingProviderObject.provider == provider)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, **kwargs: Any) -> BillingProviderObject:
        now = now_unix_seconds()
        obj = BillingProviderObject(
            **kwargs,
            created_at=kwargs.get("created_at", now),
            updated_at=kwargs.get("updated_at", now),
        )
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def update(self, id: str, **kwargs: Any) -> BillingProviderObject | None:
        stmt = select(BillingProviderObject).where(BillingProviderObject.id == id)
        result = await self.session.execute(stmt)
        obj = result.scalars().first()

        if not obj:
            return None

        kwargs["updated_at"] = now_unix_seconds()
        for key, value in kwargs.items():
            setattr(obj, key, value)

        await self.session.flush()
        return obj
