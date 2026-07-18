import time
from typing import Any

from sqlalchemy import select, update

from db.models import AuthorizationCode
from db.repositories.base import BaseRepository


class AuthorizationCodeRepository(BaseRepository):
    async def get_by_code_hash(self, code_hash: str) -> AuthorizationCode | None:
        stmt = select(AuthorizationCode).where(AuthorizationCode.code_hash == code_hash)
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> AuthorizationCode:
        code = AuthorizationCode(**kwargs)
        self.db.add(code)
        await self.db.flush()
        await self.db.refresh(code)
        return code

    async def consume(self, code_hash: str) -> bool:
        now = int(time.time())
        stmt = (
            update(AuthorizationCode)
            .where(
                AuthorizationCode.code_hash == code_hash,
                AuthorizationCode.used_at.is_(None),
            )
            .values(used_at=now)
            .returning(AuthorizationCode.id)
        )
        result = (await self.db.scalars(stmt)).first()
        return result is not None
