"""Seed script: gives the @raheem account a populated contacts list.

Idempotent — re-running skips contacts that already exist (matched by the
``(owner_user_id, contact_user_id)`` unique constraint). The contact users are
the existing seed test users (see ``seed_test_data.py``); run that first if the
database is empty.

Run from the repo root or apps/api:
    python scripts/seed_raheem_contacts.py

Owner is resolved from PLATFORM_OWNER_USERNAME / PLATFORM_OWNER_EMAIL env vars.
Pass ``--purge`` to hard-delete the seeded contacts instead of creating them.
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

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models import Contact, User


def _build_engine_url(raw: str) -> tuple[str, dict]:
    url = raw
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    connect_args: dict = {}
    if "?" in url:
        base_url, query = url.split("?", 1)
        if "sslmode=require" in query or "ssl=require" in query:
            connect_args["ssl"] = True
        url = base_url
    return url, connect_args


DATABASE_URL, _CONNECT_ARGS = _build_engine_url(
    os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/876")
)

OWNER_USERNAME = os.environ.get("PLATFORM_OWNER_USERNAME", "")
OWNER_EMAIL = os.environ.get("PLATFORM_OWNER_EMAIL", "")

# (contact email, nickname, notes) — contact users come from seed_test_data.py.
CONTACTS = [
    ("alice.test@876seed.dev", "Ali", "Design lead on the onboarding revamp. Prefers Slack over email."),
    ("bob.test@876seed.dev", "Bobby", "Met at the 2025 platform offsite. Owns the billing integration."),
    ("carol.test@876seed.dev", "Carol O.", "Globex point of contact for the enterprise pilot."),
    ("dave.test@876seed.dev", None, "Freelance contractor — invoices monthly, net 30."),
    ("erin.test@876seed.dev", "Erin", None),
    ("frank.test@876seed.dev", "Frankie", "Referred by Carol. Interested in the API tier."),
    ("grace.test@876seed.dev", "Grace L.", "QA on mobile. Best reached mornings PT."),
    ("ivan.test@876seed.dev", None, "Security researcher. Reported the OAuth scope issue."),
    ("judy.test@876seed.dev", "Judy", "Handles procurement at Initech."),
    ("olivia.test@876seed.dev", "Liv", "Old college friend — not work related."),
]


async def _resolve_owner(session: AsyncSession) -> User | None:
    return (
        await session.execute(
            select(User).where(
                or_(User.username == OWNER_USERNAME, User.email == OWNER_EMAIL)
            )
        )
    ).scalar_one_or_none()


async def _purge(session: AsyncSession, owner: User) -> None:
    result = await session.execute(
        delete(Contact).where(Contact.owner_user_id == owner.id)
    )
    await session.commit()
    print(f"Purged {result.rowcount} contact(s) for {owner.email}.")


async def _seed(session: AsyncSession, owner: User) -> None:
    created = 0
    skipped = 0
    for email, nickname, notes in CONTACTS:
        contact_user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if contact_user is None:
            print(f"  ! skip — no user for {email} (run seed_test_data.py first)")
            skipped += 1
            continue

        existing = (
            await session.execute(
                select(Contact).where(
                    Contact.owner_user_id == owner.id,
                    Contact.contact_user_id == contact_user.id,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            skipped += 1
            continue

        now = now_unix_seconds()
        session.add(
            Contact(
                id=generate_id("contact"),
                owner_user_id=owner.id,
                contact_user_id=contact_user.id,
                nickname=nickname,
                notes=notes,
                created_at=now,
                updated_at=now,
            )
        )
        created += 1

    await session.commit()
    print(f"Done — {created} created, {skipped} skipped, for {owner.email}.")


async def main() -> None:
    purge = "--purge" in sys.argv
    engine = create_async_engine(DATABASE_URL, connect_args=_CONNECT_ARGS)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        owner = await _resolve_owner(session)
        if owner is None:
            print(f"! No user found for @{OWNER_USERNAME} / {OWNER_EMAIL}.")
            await engine.dispose()
            sys.exit(1)
        if purge:
            await _purge(session, owner)
        else:
            await _seed(session, owner)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
