from __future__ import annotations

from sqlalchemy import select

from core.id import generate_id
from core.pin import LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS, hash_pin
from core.timestamps import now_unix_seconds
from db.models import UserPin
from db.repositories.base import BaseRepository


class UserPinRepository(BaseRepository):
    async def retrieve(self, user_id: str, scope: str = "account") -> UserPin | None:
        return (
            await self.db.scalars(select(UserPin).where(UserPin.user_id == user_id, UserPin.scope == scope))
        ).first()

    async def set_pin(self, user_id: str, pin: str, scope: str = "account") -> UserPin:
        """Creates or replaces the PIN, clearing any lockout.

        Replacing a PIN resets `failed_attempts` and `locked_until`: the
        credential being guessed no longer exists, so continuing to hold a
        lockout against the new one would punish the account owner for an
        attacker's failures.
        """
        now = now_unix_seconds()
        row = await self.retrieve(user_id, scope)

        if row is None:
            row = UserPin(
                id=generate_id("userPin"),
                user_id=user_id,
                scope=scope,
                pin_hash=hash_pin(pin),
                algorithm="scrypt",
                failed_attempts=0,
                locked_until=None,
                last_verified_at=None,
                set_at=now,
                created_at=now,
                updated_at=now,
            )
            self.db.add(row)
        else:
            row.pin_hash = hash_pin(pin)
            row.algorithm = "scrypt"
            row.failed_attempts = 0
            row.locked_until = None
            row.set_at = now
            row.updated_at = now

        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def record_success(self, row: UserPin) -> UserPin:
        now = now_unix_seconds()
        row.failed_attempts = 0
        row.locked_until = None
        row.last_verified_at = now
        row.updated_at = now
        await self.db.flush()
        return row

    async def record_failure(self, row: UserPin) -> UserPin:
        """Counts a wrong guess and locks the PIN at the threshold."""
        now = now_unix_seconds()
        row.failed_attempts += 1
        if row.failed_attempts >= MAX_FAILED_ATTEMPTS:
            row.locked_until = now + LOCKOUT_SECONDS
            row.failed_attempts = 0
        row.updated_at = now
        await self.db.flush()
        return row

    async def clear(self, user_id: str, scope: str = "account") -> bool:
        row = await self.retrieve(user_id, scope)
        if row is None:
            return False

        await self.db.delete(row)
        await self.db.flush()
        return True
