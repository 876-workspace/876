"""
Promote a user to super_admin by email.

Run from apps/api:
    python scripts/promote_admin.py owner@example.com

Or promote to a specific role:
    python scripts/promote_admin.py owner@example.com admin

With no email argument, falls back to the PLATFORM_OWNER_EMAIL env var.
"""
# ruff: noqa: E402

from __future__ import annotations

import asyncio
import os
import sys

_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)

from dotenv import load_dotenv

load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from core.timestamps import now_unix_seconds
from db.models import User


async def promote(email: str, role: str) -> None:
    raw_url = os.environ.get("DATABASE_URL") or os.environ.get("DB_URL")
    if not raw_url:
        print("ERROR: DATABASE_URL or DB_URL environment variable is required.")
        sys.exit(1)

    # Mirror the URL transformation used in db/session.py
    db_url = raw_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    connect_args = {}
    if "?" in db_url:
        base_url, query = db_url.split("?", 1)
        if "sslmode=require" in query or "ssl=require" in query:
            connect_args["ssl"] = True
        db_url = base_url

    engine = create_async_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore[call-overload]

    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"ERROR: No user found with email '{email}'.")
            await engine.dispose()
            sys.exit(1)

        previous_role = user.role
        user.role = role
        user.updated_at = now_unix_seconds()
        await session.commit()

        print(f"OK: {email} promoted from '{previous_role}' → '{role}'")
        print(f"    User ID : {user.id}")
        print(f"    Username: {user.username or '—'}")

    await engine.dispose()


if __name__ == "__main__":
    target_email = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PLATFORM_OWNER_EMAIL", "")
    if not target_email:
        print("ERROR: pass an email argument or set PLATFORM_OWNER_EMAIL.")
        sys.exit(1)
    target_role = sys.argv[2] if len(sys.argv) > 2 else "super_admin"

    valid_roles = {"user", "staff", "admin", "super_admin"}
    if target_role not in valid_roles:
        print(f"ERROR: Invalid role '{target_role}'. Must be one of: {', '.join(sorted(valid_roles))}")
        sys.exit(1)

    asyncio.run(promote(target_email, target_role))
