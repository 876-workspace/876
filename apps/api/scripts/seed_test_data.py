"""Seed script: creates 5 test users and 3 test organizations with memberships.

Idempotent — re-running skips records that already exist (matched by email/slug).

Run from the repo root or apps/api:
    python scripts/seed_test_data.py

Membership layout is deliberately varied so the soft-delete / purge / membership
flows can be exercised end to end:
  - "Acme Industries"  -> alice (owner) + bob (member)   => has members, soft-delete is BLOCKED
  - "Globex Corp"      -> carol (owner)                   => has members, soft-delete is BLOCKED
  - "Initech"          -> (no members)                    => empty, soft-delete is ALLOWED
  - dave, erin         -> no membership                   => standalone users
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
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.migrate import ensure_identity_columns
from db.models import Membership, Organization, User, UserProfile


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

# (key, email, first_name, last_name)
TEST_USERS = [
    ("alice", "alice.test@876seed.dev", "Alice", "Nguyen"),
    ("bob", "bob.test@876seed.dev", "Bob", "Martinez"),
    ("carol", "carol.test@876seed.dev", "Carol", "Okafor"),
    ("dave", "dave.test@876seed.dev", "Dave", "Petrov"),
    ("erin", "erin.test@876seed.dev", "Erin", "Sharma"),
    ("frank", "frank.test@876seed.dev", "Frank", "Adeyemi"),
    ("grace", "grace.test@876seed.dev", "Grace", "Liu"),
    ("heidi", "heidi.test@876seed.dev", "Heidi", "Kowalski"),
    ("ivan", "ivan.test@876seed.dev", "Ivan", "Sorensen"),
    ("judy", "judy.test@876seed.dev", "Judy", "Fernandez"),
    ("mallory", "mallory.test@876seed.dev", "Mallory", "Brooks"),
    ("niaj", "niaj.test@876seed.dev", "Niaj", "Rahman"),
    ("olivia", "olivia.test@876seed.dev", "Olivia", "Costa"),
    ("peggy", "peggy.test@876seed.dev", "Peggy", "Andersson"),
    ("victor", "victor.test@876seed.dev", "Victor", "Hughes"),
]

# (slug, name)
TEST_ORGS = [
    ("acme-industries-seed", "Acme Industries"),
    ("globex-corp-seed", "Globex Corp"),
    ("initech-seed", "Initech"),
    ("umbrella-corp-seed", "Umbrella Corp"),
    ("stark-industries-seed", "Stark Industries"),
]

# (org_slug, user_key, role)
TEST_MEMBERSHIPS = [
    ("acme-industries-seed", "alice", "owner"),
    ("acme-industries-seed", "bob", "member"),
    ("globex-corp-seed", "carol", "owner"),
    ("umbrella-corp-seed", "frank", "owner"),
    ("umbrella-corp-seed", "grace", "member"),
    ("umbrella-corp-seed", "heidi", "member"),
    # initech + stark-industries intentionally left with no members (deletable).
]


async def upsert_user(session: AsyncSession, key: str, email: str, first: str, last: str) -> User:
    existing = (await session.scalars(select(User).where(User.email == email))).first()
    if existing:
        print(f"  user: {email} exists ({existing.id})")
        return existing
    now = now_unix_seconds()
    user = User(
        id=generate_id("user"),
        workos_user_id=f"user_seedtest_{key}",
        email=email,
        email_verified=True,
        first_name=first,
        last_name=last,
        role="user",
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    await session.flush()
    session.add(
        UserProfile(
            id=generate_id("userProfile"),
            user_id=user.id,
            created_at=now,
            updated_at=now,
        )
    )
    await session.flush()
    print(f"  user: created {email} ({user.id})")
    return user


async def upsert_org(session: AsyncSession, slug: str, name: str) -> Organization:
    existing = (await session.scalars(select(Organization).where(Organization.slug == slug))).first()
    if existing:
        print(f"  org: {slug} exists ({existing.id})")
        return existing
    now = now_unix_seconds()
    org = Organization(
        id=generate_id("organization"),
        name=name,
        slug=slug,
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add(org)
    await session.flush()
    print(f"  org: created {slug} ({org.id})")
    return org


async def upsert_membership(session: AsyncSession, org: Organization, user: User, role: str) -> None:
    existing = (
        await session.scalars(
            select(Membership).where(
                Membership.organization_id == org.id,
                Membership.user_id == user.id,
                Membership.deleted_at.is_(None),
            )
        )
    ).first()
    if existing:
        print(f"  membership: {user.email} in {org.slug} exists")
        return
    now = now_unix_seconds()
    session.add(
        Membership(
            id=generate_id("membership"),
            organization_id=org.id,
            user_id=user.id,
            role=role,
            status="active",
            created_at=now,
            updated_at=now,
        )
    )
    await session.flush()
    print(f"  membership: {user.email} -> {org.slug} ({role})")


async def main() -> None:
    engine = create_async_engine(DATABASE_URL, connect_args=_CONNECT_ARGS)
    async with engine.begin() as conn:
        await conn.run_sync(ensure_identity_columns)

    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with Session() as session:
        print("Seeding test users...")
        users = {key: await upsert_user(session, key, email, first, last) for key, email, first, last in TEST_USERS}

        print("Seeding test organizations...")
        orgs = {slug: await upsert_org(session, slug, name) for slug, name in TEST_ORGS}

        print("Seeding memberships...")
        for org_slug, user_key, role in TEST_MEMBERSHIPS:
            await upsert_membership(session, orgs[org_slug], users[user_key], role)

        await session.commit()
    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
