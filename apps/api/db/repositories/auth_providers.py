from typing import Any

from sqlalchemy import select, update

from db.models import AuthProvider
from db.repositories.base import BaseRepository


class AuthProviderRepository(BaseRepository):
    async def get_by_id(self, provider_id: str) -> AuthProvider | None:
        return await self.db.get(AuthProvider, provider_id)

    async def get_enabled_by_id(self, provider_id: str) -> AuthProvider | None:
        stmt = select(AuthProvider).where(
            AuthProvider.id == provider_id,
            AuthProvider.is_enabled == True,  # noqa: E712
        )
        return (await self.db.scalars(stmt)).first()

    async def list_enabled(self) -> list[AuthProvider]:
        stmt = (
            select(AuthProvider)
            .where(AuthProvider.is_enabled == True)  # noqa: E712
            .order_by(AuthProvider.sort_order.asc(), AuthProvider.label.asc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> AuthProvider:
        provider = AuthProvider(**kwargs)
        self.db.add(provider)
        await self.db.flush()
        await self.db.refresh(provider)
        return provider

    async def update(self, provider_id: str, **kwargs: Any) -> AuthProvider | None:
        stmt = update(AuthProvider).where(AuthProvider.id == provider_id).values(**kwargs).returning(AuthProvider)
        return (await self.db.scalars(stmt)).first()
