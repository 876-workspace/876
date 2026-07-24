"""
Seed script: creates the Efesto internal organization and registers the
canonical 876 first-party applications with API keys.

Run once per environment:
    python scripts/seed_internal.py

The script is idempotent — running it again will skip already-existing records
and only print keys for newly created entries.
"""
# ruff: noqa: E402

from __future__ import annotations

import asyncio
import os
import sys

# Allow running from the repo root or from apps/api
_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)

# Load .env.development.local, then .env.development, then .env. `override=False`
# means the first file to define a key wins, so the gitignored `.local` file
# (written by scripts/setup-dev-env.mjs) takes precedence.
from dotenv import load_dotenv

load_dotenv(os.path.join(_api_root, ".env.development.local"), override=False)
load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from core.id import generate_id
from core.platform_apps import PLATFORM_APPS
from core.timestamps import now_unix_seconds
from db.migrate import ensure_identity_columns
from db.models import ApiKey, App, Membership, Organization, User
from utils.security_helpers import (
    generate_api_key,
    generate_client_id,
    hash_api_key,
)


def _build_engine_url(raw: str) -> tuple[str, dict]:
    """Mirror the URL transformation in db/session.py."""
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


_raw_db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/876")
DATABASE_URL, _CONNECT_ARGS = _build_engine_url(_raw_db_url)


async def run_migrations(conn) -> None:
    """Idempotent DDL: rename table and add new columns."""
    await conn.execute(
        text("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'registered_apps'
            ) THEN
                ALTER TABLE registered_apps RENAME TO apps;
            END IF;
        END
        $$;
        """)
    )
    await conn.execute(
        text("""
        ALTER TABLE apps
            ADD COLUMN IF NOT EXISTS organization_id VARCHAR
            REFERENCES organizations(id) ON DELETE SET NULL;
        """)
    )
    await conn.execute(
        text("""
        ALTER TABLE apps
            ADD COLUMN IF NOT EXISTS app_kind VARCHAR NOT NULL DEFAULT 'external';
        """)
    )
    await conn.execute(
        text("""
        ALTER TABLE apps
            ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active';
        """)
    )
    await conn.execute(
        text("""
        ALTER TABLE apps DROP COLUMN IF EXISTS is_first_party;
        """)
    )
    await conn.execute(
        text("""
        CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
            id VARCHAR PRIMARY KEY,
            token_hash VARCHAR NOT NULL UNIQUE,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            app_id VARCHAR NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
            session_id VARCHAR REFERENCES sessions(id) ON DELETE SET NULL,
            scope VARCHAR NOT NULL,
            expires_at BIGINT NOT NULL,
            used_at BIGINT,
            revoked_at BIGINT,
            created_at BIGINT NOT NULL
        );
        """)
    )
    await conn.execute(
        text("""
        ALTER TABLE authorization_codes
            ADD COLUMN IF NOT EXISTS org_id VARCHAR
            REFERENCES organizations(id) ON DELETE SET NULL;
        """)
    )
    # Update FK in child tables if they still reference the old table name
    # (Postgres carries these automatically on RENAME, but guard anyway)
    print("✓ DDL migrations applied")


async def upsert_efesto_org(session: AsyncSession) -> Organization:
    result = await session.execute(select(Organization).where(Organization.slug == "efesto"))
    org = result.scalar_one_or_none()
    if org:
        print(f"  org: efesto already exists ({org.id})")
        return org

    now = now_unix_seconds()
    org = Organization(
        id=generate_id("organization"),
        name="Efesto Technologies, Inc",
        short_name="Efesto",
        slug="efesto",
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add(org)
    await session.flush()
    print(f"  org: created efesto ({org.id})")
    return org


async def upsert_internal_app(
    session: AsyncSession,
    *,
    slug: str,
    name: str,
    organization_id: str,
) -> tuple[App, bool]:
    """Create or skip a public OIDC client app. Returns (app, created)."""
    redirect_uris = internal_app_redirect_uris(slug)
    logout_uris = internal_app_logout_uris(slug)
    app_kind = next((p.app_kind for p in PLATFORM_APPS if p.slug == slug), "internal")
    result = await session.execute(select(App).where(App.slug == slug))
    app = result.scalar_one_or_none()
    if app:
        changed = sync_redirect_uris(app, redirect_uris) | sync_logout_uris(app, logout_uris)
        if app.app_kind != app_kind:
            app.app_kind = app_kind
            changed = True
        if changed:
            app.updated_at = now_unix_seconds()
            await session.flush()
            print(f"  app: {slug} URIs updated ({app.id})")
        else:
            print(f"  app: {slug} already exists ({app.id})")
        print(f"  app: {slug} client_id={app.client_id}")
        return app, False

    now = now_unix_seconds()
    app = App(
        id=generate_id("registeredApp"),
        name=name,
        slug=slug,
        organization_id=organization_id,
        client_id=generate_client_id(),
        client_secret_hash=None,
        client_type="public",
        app_kind=app_kind,
        status="active",
        allowed_redirect_uris=redirect_uris,
        allowed_logout_uris=logout_uris,
        type="web",
        scopes_allowed=["openid", "profile", "email"],
        created_at=now,
        updated_at=now,
    )
    session.add(app)
    await session.flush()
    print(f"  app: created {slug} ({app.id})")
    print(f"  app: {slug} client_id={app.client_id}")
    return app, True


def internal_app_logout_uris(slug: str) -> list[str]:
    """Post-logout redirect URIs validated by the end_session_endpoint."""
    if slug == "876-enterprise":
        origins = [os.environ.get("ENTERPRISE_URL"), dev_preview_origin(3001), "http://localhost:3001"]
    elif slug == "876-consumer":
        origins = [os.environ.get("APP_URL"), dev_preview_origin(3000), "http://localhost:3000"]
    elif slug == "console":
        origins = [
            os.environ.get("CONSOLE_URL"),
            dev_preview_origin(3002),
            "http://localhost:3002",
            "https://876-misc.vercel.app",
        ]
    elif slug == "876-couriers":
        origins = [os.environ.get("COURIERS_URL"), dev_preview_origin(3003), "http://localhost:3003"]
    elif slug == "876-billing":
        origins = [os.environ.get("BILLING_URL"), dev_preview_origin(3004), "http://localhost:3004"]
    else:
        return []
    return [f"{o.rstrip('/')}/logged-out" for o in dict.fromkeys(origins) if o]


def internal_app_redirect_uris(slug: str) -> list[str]:
    if slug == "876-enterprise":
        configured_url = os.environ.get("ENTERPRISE_URL")
        origins = [
            configured_url,
            dev_preview_origin(3001),
            "http://localhost:3001",
        ]
    elif slug == "876-consumer":
        configured_url = os.environ.get("APP_URL")
        origins = [
            configured_url,
            dev_preview_origin(3000),
            "http://localhost:3000",
        ]
    elif slug == "console":
        configured_url = os.environ.get("CONSOLE_URL")
        origins = [
            configured_url,
            dev_preview_origin(3002),
            "http://localhost:3002",
            "https://876-misc.vercel.app",
        ]
    elif slug == "876-couriers":
        configured_url = os.environ.get("COURIERS_URL")
        origins = [
            configured_url,
            dev_preview_origin(3003),
            "http://localhost:3003",
        ]
    elif slug == "876-billing":
        configured_url = os.environ.get("BILLING_URL")
        origins = [
            configured_url,
            dev_preview_origin(3004),
            "http://localhost:3004",
        ]
    else:
        return []

    return [f"{origin.rstrip('/')}/oauth/callback" for origin in dict.fromkeys(origins) if origin]


def sync_redirect_uris(app: App, redirect_uris: list[str]) -> bool:
    if not redirect_uris:
        return False
    existing = list(app.allowed_redirect_uris or [])
    merged = list(dict.fromkeys([*existing, *redirect_uris]))
    if merged == existing:
        return False
    app.allowed_redirect_uris = merged
    return True


def sync_logout_uris(app: App, logout_uris: list[str]) -> bool:
    if not logout_uris:
        return False
    existing = list(app.allowed_logout_uris or [])
    merged = list(dict.fromkeys([*existing, *logout_uris]))
    if merged == existing:
        return False
    app.allowed_logout_uris = merged
    return True


def dev_preview_origin(port: int) -> str | None:
    """Browser origin for a forwarded port inside a remote dev workspace.

    `DEV_PREVIEW_HOST_TEMPLATE` is the provider-agnostic contract written by
    `scripts/setup-dev-env.mjs` — a hostname containing a literal `{port}`
    placeholder, since Codespaces and Ona/Gitpod shape forwarded hostnames
    differently. The Codespaces env vars remain as a fallback.
    """
    template = os.environ.get("DEV_PREVIEW_HOST_TEMPLATE", "").strip()
    if template:
        return f"https://{template.replace('{port}', str(port))}"

    codespace_name = os.environ.get("CODESPACE_NAME")
    forwarding_domain = os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
    if not codespace_name or not forwarding_domain:
        return None

    return f"https://{codespace_name}-{port}.{forwarding_domain}"


async def create_api_key_for_app(session: AsyncSession, app_id: str, key_name: str) -> str:
    plaintext = generate_api_key()
    now = now_unix_seconds()
    key = ApiKey(
        id=generate_id("apiKey"),
        app_id=app_id,
        key_hash=hash_api_key(plaintext),
        name=key_name,
        created_at=now,
    )
    session.add(key)
    await session.flush()
    return plaintext


# Public OIDC clients — browser-facing PKCE flows. Sourced from the shared
# platform app registry so this script can't drift from main.py's boot seed.
INTERNAL_APPS = [
    {"slug": app.slug, "name": app.name, "env_var": app.api_key_env}
    for app in PLATFORM_APPS
]

DEV_ADMIN_EMAIL = os.environ.get("PLATFORM_OWNER_EMAIL", "")


async def upsert_dev_admin_membership(session: AsyncSession) -> None:
    """Ensure DEV_ADMIN_EMAIL has an active admin membership in the efesto org."""
    user_result = await session.execute(
        select(User).where(User.email == DEV_ADMIN_EMAIL)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        print(f"  dev membership: user {DEV_ADMIN_EMAIL} not found — skipping")
        print("  (sign in at least once to create the account, then re-run)")
        return

    org_result = await session.execute(select(Organization).where(Organization.slug == "efesto"))
    org = org_result.scalar_one_or_none()
    if not org:
        print("  dev membership: efesto org not found — skipping")
        return

    existing = await session.execute(
        select(Membership).where(
            Membership.organization_id == org.id,
            Membership.user_id == user.id,
        )
    )
    membership = existing.scalar_one_or_none()
    if membership:
        if membership.status != "active" or membership.role != "admin":
            membership.status = "active"
            membership.role = "admin"
            membership.updated_at = now_unix_seconds()
            await session.flush()
            print(f"  dev membership: updated {DEV_ADMIN_EMAIL} to admin/active in efesto")
        else:
            print(f"  dev membership: {DEV_ADMIN_EMAIL} already admin in efesto")
        return

    now = now_unix_seconds()
    session.add(Membership(
        id=generate_id("membership"),
        organization_id=org.id,
        user_id=user.id,
        role="admin",
        status="active",
        created_at=now,
        updated_at=now,
    ))
    await session.flush()
    print(f"  dev membership: created admin membership for {DEV_ADMIN_EMAIL} in efesto")


async def seed() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_CONNECT_ARGS)

    async with engine.begin() as conn:
        await conn.run_sync(ensure_identity_columns)
        await run_migrations(conn)

    async with AsyncSession(engine) as session, session.begin():
        print("\nSeeding efesto organization...")
        org = await upsert_efesto_org(session)

        print("\nSeeding internal apps (public OIDC clients)...")
        new_keys: list[tuple[str, str, str]] = []

        for app_def in INTERNAL_APPS:
            app, created = await upsert_internal_app(
                session,
                slug=app_def["slug"],
                name=app_def["name"],
                organization_id=org.id,
            )
            has_active_key = (
                await session.scalars(
                    select(ApiKey.id).where(
                        ApiKey.app_id == app.id,
                        ApiKey.revoked.is_(False),
                    )
                )
            ).first()
            if created or not has_active_key:
                plaintext = await create_api_key_for_app(session, app.id, "default")
                new_keys.append((app_def["slug"], app_def["env_var"], plaintext))
                action = "created" if created else "restored"
                print(f"  key: {action} API key for {app_def['slug']}")

    async with AsyncSession(engine) as session, session.begin():
        print("\nSeeding dev admin membership...")
        await upsert_dev_admin_membership(session)

    await engine.dispose()

    if new_keys:
        print("\n" + "=" * 60)
        print("Add the following to your .env.development.local files:")
        print("=" * 60)
        for slug, env_var, key in new_keys:
            print(f"# {slug} (API key)")
            print(f"{env_var}={key}")
        print("=" * 60)
    else:
        print("\n✓ All internal apps already seeded — no new keys generated.")


if __name__ == "__main__":
    asyncio.run(seed())
