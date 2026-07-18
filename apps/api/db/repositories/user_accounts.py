from sqlalchemy import delete, select

from db.models import Account
from db.repositories.base import BaseRepository


class UserAccountRepository(BaseRepository):
    async def list_for_user(self, user_id: str) -> list[Account]:
        stmt = select(Account).where(Account.user_id == user_id).order_by(Account.created_at)
        return list((await self.db.scalars(stmt)).all())

    async def get(self, account_id: str, user_id: str) -> Account | None:
        """Returns the account only if it belongs to the given user."""
        stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
        return (await self.db.scalars(stmt)).first()

    async def delete(self, account_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            delete(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        return bool(getattr(result, "rowcount", 0) > 0)
