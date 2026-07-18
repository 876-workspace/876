from typing import Any

from sqlalchemy import delete, or_, select, update

from core.config import is_platform_owner_email
from core.deletion import deletion_values
from core.errors import AppHTTPException
from core.id import generate_id, generate_platform_owner_user_id
from core.timestamps import now_unix_seconds
from db.models import User, UserProfile
from db.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    async def get_by_id(self, user_id: str, include_deleted: bool = False) -> User | None:
        user = await self.db.get(User, user_id)
        if user is None:
            return None
        if not include_deleted and user.deleted_at is not None:
            return None
        return user

    async def get_by_workos_id(self, workos_user_id: str) -> User | None:
        stmt = select(User).where(User.workos_user_id == workos_user_id, User.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_email(self, email: str) -> User | None:
        normalized = email.lower().strip()
        stmt = select(User).where(User.email == normalized, User.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_username(self, username: str, include_deleted: bool = False) -> User | None:
        stmt = select(User).where(User.username == username)
        if not include_deleted:
            stmt = stmt.where(User.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def search(
        self,
        query: str,
        limit: int = 20,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> list[User]:
        pattern = f"%{query}%"
        stmt = select(User).where(
            or_(
                User.email.ilike(pattern),
                User.username.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )
        if not include_deleted:
            stmt = stmt.where(User.deleted_at.is_(None))
        if status:
            stmt = stmt.where(User.status == status)
        stmt = stmt.order_by(User.created_at.desc()).limit(limit)
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> User:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user_id: str, **kwargs: Any) -> User | None:
        stmt = update(User).where(User.id == user_id).values(**kwargs).returning(User)
        result = (await self.db.scalars(stmt)).first()
        return result

    async def delete(
        self,
        user_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt = (
            update(User)
            .where(User.id == user_id, User.deleted_at.is_(None))
            .values(**deletion_values(deleted_by, reason))
        )
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def purge(self, user_id: str) -> bool:
        stmt = delete(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def ensure_from_workos(self, workos_user: Any) -> "User":
        """Get or create a local user record from a WorkOS provider user object."""
        user = await self.get_by_workos_id(workos_user.id)
        if user:
            now = now_unix_seconds()
            email = workos_user.email.lower().strip()
            updated_user = await self.update(
                user.id,
                email=email,
                email_verified=workos_user.email_verified,
                first_name=workos_user.first_name or user.first_name,
                last_name=workos_user.last_name or user.last_name,
                avatar=workos_user.avatar or user.avatar,
                platform_role="owner" if is_platform_owner_email(email) else user.platform_role,
                updated_at=now,
            )
            return updated_user or user

        # No local user maps to this WorkOS id yet. Before creating a new
        # account, check whether the email already belongs to an existing one —
        # e.g. a user who signed up with email+password and is now returning via
        # social sign-in (or vice versa). Link the connection to that canonical
        # account instead of creating a duplicate, which `users.email` UNIQUE
        # would reject anyway.
        #
        # Security: only auto-link when the provider asserts the email is
        # verified. Linking on an unverified email is an account-takeover vector
        # (an attacker could "claim" someone else's email via a provider that
        # does not verify it). Google/Microsoft/Apple verify, so this is safe.
        email = workos_user.email.lower().strip()
        existing = await self.get_by_email(email)
        if existing:
            if not workos_user.email_verified:
                raise AppHTTPException(
                    code="auth/email-already-registered",
                    message=(
                        "An account already exists for this email. Sign in with "
                        "your existing method, or verify this email to link it."
                    ),
                    http_status_code=409,
                )
            now = now_unix_seconds()
            linked = await self.update(
                existing.id,
                workos_user_id=workos_user.id,
                email_verified=True,
                first_name=workos_user.first_name or existing.first_name,
                last_name=workos_user.last_name or existing.last_name,
                avatar=workos_user.avatar or existing.avatar,
                updated_at=now,
            )
            return linked or existing

        now = now_unix_seconds()
        email = workos_user.email.lower().strip()
        first_name = workos_user.first_name or email.split("@")[0]
        last_name = workos_user.last_name or "User"
        user_id = generate_platform_owner_user_id() if is_platform_owner_email(email) else generate_id("user")
        user = await self.create(
            id=user_id,
            workos_user_id=workos_user.id,
            email=email,
            email_verified=workos_user.email_verified,
            first_name=first_name,
            last_name=last_name,
            avatar=workos_user.avatar,
            role="user",
            platform_role="owner" if is_platform_owner_email(email) else None,
            status="active",
            created_at=now,
            updated_at=now,
        )
        profile = UserProfile(
            id=generate_id("userProfile"),
            user_id=user_id,
            created_at=now,
            updated_at=now,
        )
        self.db.add(profile)
        await self.db.flush()
        return user

    async def list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> tuple[list[User], bool]:
        from sqlalchemy.sql.elements import ColumnElement
        filters: list[ColumnElement[bool]] = [] if include_deleted else [User.deleted_at.is_(None)]
        if status:
            filters.append(User.status == status)
        return await self.cursor_paginate_filtered(
            User,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    async def set_banned(
        self,
        user_id: str,
        *,
        banned: bool,
        reason: str | None = None,
    ) -> User | None:
        user = await self.db.get(User, user_id)
        if user is None:
            return None
        user.banned = banned
        user.banned_reason = reason if banned else None
        from core.timestamps import now_unix_seconds
        user.updated_at = now_unix_seconds()
        await self.db.flush()
        await self.db.refresh(user)
        return user
