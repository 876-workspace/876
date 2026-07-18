import time
from typing import Any

from sqlalchemy import delete

from db.models import AuthEmailOtpChallenge
from db.repositories.base import BaseRepository


class AuthEmailOtpRepository(BaseRepository):
    async def get_by_email(self, email: str) -> AuthEmailOtpChallenge | None:
        return await self.db.get(AuthEmailOtpChallenge, email)

    async def upsert(self, email: str, **kwargs: Any) -> AuthEmailOtpChallenge:
        existing = await self.get_by_email(email)
        now = int(time.time())
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            existing.updated_at = now
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        challenge = AuthEmailOtpChallenge(email=email, **kwargs)
        self.db.add(challenge)
        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def delete(self, email: str) -> bool:
        stmt = delete(AuthEmailOtpChallenge).where(AuthEmailOtpChallenge.email == email)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)
