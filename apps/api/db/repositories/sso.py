from typing import Any

from sqlalchemy import select, update

from db.models import SsoConnection, SsoIdentity
from db.repositories.base import BaseRepository


class SsoConnectionRepository(BaseRepository):
    async def get_by_id(self, connection_id: str) -> SsoConnection | None:
        return await self.db.get(SsoConnection, connection_id)

    async def get_by_external_id(self, provider_id: str, external_connection_id: str) -> SsoConnection | None:
        stmt = select(SsoConnection).where(
            SsoConnection.provider_id == provider_id,
            SsoConnection.external_connection_id == external_connection_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> SsoConnection:
        connection = SsoConnection(**kwargs)
        self.db.add(connection)
        await self.db.flush()
        await self.db.refresh(connection)
        return connection

    async def update(self, connection_id: str, **kwargs: Any) -> SsoConnection | None:
        stmt = update(SsoConnection).where(SsoConnection.id == connection_id).values(**kwargs).returning(SsoConnection)
        return (await self.db.scalars(stmt)).first()


class SsoIdentityRepository(BaseRepository):
    async def get_by_id(self, identity_id: str) -> SsoIdentity | None:
        return await self.db.get(SsoIdentity, identity_id)

    async def get_by_external_id(self, provider_id: str, external_identity_id: str) -> SsoIdentity | None:
        stmt = select(SsoIdentity).where(
            SsoIdentity.provider_id == provider_id,
            SsoIdentity.external_identity_id == external_identity_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def list_for_user(self, user_id: str) -> list[SsoIdentity]:
        stmt = select(SsoIdentity).where(SsoIdentity.user_id == user_id).order_by(SsoIdentity.created_at.desc())
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> SsoIdentity:
        identity = SsoIdentity(**kwargs)
        self.db.add(identity)
        await self.db.flush()
        await self.db.refresh(identity)
        return identity

    async def update(self, identity_id: str, **kwargs: Any) -> SsoIdentity | None:
        stmt = update(SsoIdentity).where(SsoIdentity.id == identity_id).values(**kwargs).returning(SsoIdentity)
        return (await self.db.scalars(stmt)).first()
