import asyncio
import importlib
import importlib.util
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select as sa_select
from sqlalchemy import text as sa_text
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.v1 import router as api_router
from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import configure_logging, get_logger
from core.middleware import APIEnvelopeMiddleware, RequestLoggingMiddleware
from core.openapi import SWAGGER_UI_PARAMETERS, custom_generate_unique_id, setup_openapi
from core.platform_apps import PLATFORM_APPS
from core.products import PLATFORM_PRODUCTS
from core.timestamps import now_unix_seconds
from db.migrate import (
    backfill_billing_v3_data,
    ensure_apps_status_column,
    ensure_billing_v2,
    ensure_billing_v3_schema,
    ensure_feature_flag_provider_columns,
    ensure_finance_provisioning_schema,
    ensure_identity_columns,
    ensure_indexes,
    ensure_invite_source_app_column,
    ensure_org_business_identity_columns,
    ensure_organizations_stripe_customer_id,
    ensure_provisioning_v1_cutover,
    ensure_subscription_lifecycle_columns,
    ensure_tax_catalog_schema,
    ensure_user_profile_country_column,
)
from db.models import App as AppModel
from db.models import AuthProvider, Base, Membership, Organization, SocialPlatform, User
from db.repositories.apps import AppRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.prices import PriceRepository
from db.repositories.products import ProductRepository
from db.session import AsyncSessionLocal
from db.session import lifespan as db_lifespan
from services.billing_customer_dispatch import run_billing_sync_worker
from services.feature_seeds import (
    seed_billing_features,
    seed_console_features,
    seed_couriers_features,
    seed_platform_widget_features,
)
from services.finance_provisioning_dispatch import run_finance_provisioning_worker
from services.plan_seeds import (
    backfill_billing_plan_assignments,
    ensure_plan_module_tables,
    seed_platform_plan_modules,
)
from services.provisioning_seeds import seed_first_party_provisioning_manifests
from utils.security_helpers import generate_client_id

_sentry_sdk: Any | None = None
if importlib.util.find_spec("sentry_sdk") is not None:
    _sentry_sdk = importlib.import_module("sentry_sdk")

logger = get_logger(__name__)


async def _seed_identity_tables(engine: object) -> None:
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(ensure_identity_columns)
        await conn.run_sync(ensure_indexes)
        await conn.run_sync(ensure_organizations_stripe_customer_id)
        await conn.run_sync(ensure_org_business_identity_columns)
        await conn.run_sync(ensure_user_profile_country_column)
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["auth_providers"],
                    Base.metadata.tables["social_platforms"],
                    Base.metadata.tables["user_social_profiles"],
                    Base.metadata.tables["sso_connections"],
                    Base.metadata.tables["sso_identities"],
                    Base.metadata.tables["organization_roles"],
                    Base.metadata.tables["addresses"],
                    Base.metadata.tables["contacts"],
                ],
                checkfirst=True,
            )
        )

    async with AsyncSessionLocal() as session:
        now = now_unix_seconds()
        providers = [
            ("google", "Google", "google", "GoogleOAuth", 10),
            ("apple", "Apple", "apple", "AppleOAuth", 20),
            ("microsoft", "Microsoft", "microsoft", "MicrosoftOAuth", 30),
            ("github", "GitHub", "github", "GitHubOAuth", 40),
            ("gitlab", "GitLab", "gitlab", "GitLabOAuth", 50),
            ("linkedin", "LinkedIn", "linkedin", "LinkedInOAuth", 60),
            ("slack", "Slack", "slack", "SlackOAuth", 70),
            ("email-password", "Email and password", "mail", None, 100),
        ]
        for provider_id, label, icon_slug, workos_provider_id, sort_order in providers:
            provider = await session.get(AuthProvider, provider_id)
            if provider is None:
                session.add(
                    AuthProvider(
                        id=provider_id,
                        label=label,
                        icon_slug=icon_slug,
                        provider_type="credential" if provider_id == "email-password" else "oauth",
                        workos_provider_id=workos_provider_id,
                        is_enabled=True,
                        sort_order=sort_order,
                        created_at=now,
                        updated_at=now,
                    )
                )
            else:
                provider.label = label
                provider.icon_slug = icon_slug
                provider.workos_provider_id = workos_provider_id
                provider.is_enabled = True
                provider.sort_order = sort_order
                provider.updated_at = now

        platforms = [
            ("instagram", "Instagram", "instagram", "https://instagram.com/{handle}"),
            ("x", "X", "x", "https://x.com/{handle}"),
            ("facebook", "Facebook", "facebook", "https://facebook.com/{handle}"),
            ("linkedin", "LinkedIn", "linkedin", "https://linkedin.com/in/{handle}"),
            ("youtube", "YouTube", "youtube", "https://youtube.com/@{handle}"),
            ("tiktok", "TikTok", "tiktok", "https://tiktok.com/@{handle}"),
            ("github", "GitHub", "github", "https://github.com/{handle}"),
            ("gitlab", "GitLab", "gitlab", "https://gitlab.com/{handle}"),
            ("threads", "Threads", "threads", "https://threads.net/@{handle}"),
            ("bluesky", "Bluesky", "bluesky", "https://bsky.app/profile/{handle}"),
            ("discord", "Discord", "discord", None),
            ("telegram", "Telegram", "telegram", "https://t.me/{handle}"),
            ("snapchat", "Snapchat", "snapchat", "https://snapchat.com/add/{handle}"),
            ("pinterest", "Pinterest", "pinterest", "https://pinterest.com/{handle}"),
            ("twitch", "Twitch", "twitch", "https://twitch.tv/{handle}"),
        ]
        for index, (slug, name, icon_slug, url_template) in enumerate(platforms, start=1):
            existing = (await session.scalars(sa_select(SocialPlatform).where(SocialPlatform.slug == slug))).first()
            if existing is None:
                session.add(
                    SocialPlatform(
                        id=generate_id("socialPlatform"),
                        slug=slug,
                        name=name,
                        icon_slug=icon_slug,
                        profile_url_template=url_template,
                        is_enabled=True,
                        sort_order=index * 10,
                        created_at=now,
                        updated_at=now,
                    )
                )

        owner_email = get_settings().platform_owner_email.strip().lower()
        if owner_email:
            owner = (
                await session.scalars(
                    sa_select(User).where(sa_text("lower(email) = :owner_email")).params(owner_email=owner_email)
                )
            ).first()
            if owner is not None:
                owner.platform_role = "owner"
                owner.role = "owner"
                owner.updated_at = now

        await session.commit()


async def _seed_platform_apps(engine: object) -> None:
    """Ensure Efesto Technologies org + first-party 876 apps exist in the DB."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["organizations"],
                    Base.metadata.tables["apps"],
                    Base.metadata.tables["api_keys"],
                ],
                checkfirst=True,
            )
        )
        await conn.run_sync(ensure_apps_status_column)

    async with AsyncSessionLocal() as session:
        org_repo = OrganizationRepository(session)
        app_repo = AppRepository(session)
        now = now_unix_seconds()

        # Ensure Efesto Technologies org exists
        org = await org_repo.get_by_slug("efesto")
        if org is None:
            org = await org_repo.create(
                id=generate_id("organization"),
                name="Efesto Technologies, Inc",
                short_name="Efesto",
                slug="efesto",
                status="active",
                created_at=now,
                updated_at=now,
            )

        for platform_app in PLATFORM_APPS:
            existing = (await session.scalars(sa_select(AppModel).where(AppModel.slug == platform_app.slug))).first()
            if existing is None:
                await app_repo.create(
                    id=generate_id("registeredApp"),
                    name=platform_app.name,
                    slug=platform_app.slug,
                    organization_id=org.id,
                    client_id=generate_client_id(),
                    client_secret_hash=None,
                    client_type="public",
                    app_kind=platform_app.app_kind,
                    status="active",
                    allowed_redirect_uris=[],
                    allowed_logout_uris=[],
                    logo_url=None,
                    homepage_url=platform_app.homepage_url,
                    type="web",
                    scopes_allowed=["openid", "profile", "email"],
                    created_at=now,
                    updated_at=now,
                )
            elif existing.app_kind != platform_app.app_kind:
                # Keep the taxonomy in sync with the registry (idempotent) —
                # e.g. the internal→platform/product reclassification.
                existing.app_kind = platform_app.app_kind
                existing.updated_at = now

        await session.commit()


_JM_PARISH_SEED = """
INSERT INTO regions (id, country_code, code, name, type, is_enabled) VALUES
    ('region_jm_01', 'JM', 'JM-01', 'Kingston',       'parish', true),
    ('region_jm_02', 'JM', 'JM-02', 'St. Andrew',     'parish', true),
    ('region_jm_03', 'JM', 'JM-03', 'St. Thomas',     'parish', true),
    ('region_jm_04', 'JM', 'JM-04', 'Portland',       'parish', true),
    ('region_jm_05', 'JM', 'JM-05', 'St. Mary',       'parish', true),
    ('region_jm_06', 'JM', 'JM-06', 'St. Ann',        'parish', true),
    ('region_jm_07', 'JM', 'JM-07', 'Trelawny',       'parish', true),
    ('region_jm_08', 'JM', 'JM-08', 'St. James',      'parish', true),
    ('region_jm_09', 'JM', 'JM-09', 'Hanover',        'parish', true),
    ('region_jm_10', 'JM', 'JM-10', 'Westmoreland',   'parish', true),
    ('region_jm_11', 'JM', 'JM-11', 'St. Elizabeth',  'parish', true),
    ('region_jm_12', 'JM', 'JM-12', 'Manchester',     'parish', true),
    ('region_jm_13', 'JM', 'JM-13', 'Clarendon',      'parish', true),
    ('region_jm_14', 'JM', 'JM-14', 'St. Catherine',  'parish', true)
ON CONFLICT (id) DO NOTHING;
"""


async def _seed_geo_regions(engine: object) -> None:
    """Seed the reference geo data product apps depend on: the Jamaica country
    row and its 14 parishes (ISO 3166-2:JM), used by ``organizations.region_id``.

    Idempotent — parishes are keyed by stable ids (``region_jm_01``..``_14``)
    and inserted with ``ON CONFLICT DO NOTHING`` so re-runs are no-ops.
    """
    from sqlalchemy import text

    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.execute(
            text(
                "INSERT INTO countries (code, name, is_enabled) "
                "VALUES ('JM', 'Jamaica', true) ON CONFLICT (code) DO NOTHING"
            )
        )
        await conn.execute(text(_JM_PARISH_SEED))


async def _cut_over_billing_v2(engine: object) -> None:
    """One-time flush of the old ``plans``/single-``plan_id`` shape before the

    Stripe-normalized ``products``/``prices``/``subscription_items`` tables
    are created. Must run after ``subscriptions`` exists and before
    ``_seed_platform_products`` creates ``products``.
    """
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(ensure_billing_v2)
        await conn.run_sync(ensure_subscription_lifecycle_columns)
        await conn.run_sync(ensure_billing_v3_schema)
        await conn.run_sync(ensure_tax_catalog_schema)


async def _seed_platform_products(engine: object) -> None:
    """Ensure the products/prices tables exist and the canonical catalog is seeded."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["tax_codes"],
                    Base.metadata.tables["tax_rates"],
                    Base.metadata.tables["products"],
                    Base.metadata.tables["prices"],
                    Base.metadata.tables["billing_accounts"],
                    Base.metadata.tables["billing_provider_objects"],
                ],
                checkfirst=True,
            )
        )
        await conn.run_sync(backfill_billing_v3_data)

    async with AsyncSessionLocal() as session:
        product_repo = ProductRepository(session)
        price_repo = PriceRepository(session)
        now = now_unix_seconds()

        for platform_product in PLATFORM_PRODUCTS:
            existing = await product_repo.get_by_slug(platform_product.slug)
            if existing is not None:
                continue

            app_id: str | None = None
            if platform_product.app_slug:
                app = (
                    await session.scalars(sa_select(AppModel).where(AppModel.slug == platform_product.app_slug))
                ).first()
                if app is None:
                    # The app hasn't been seeded yet (out-of-order boot); skip
                    # for now, a later boot will pick this product up.
                    continue
                app_id = app.id

            product = await product_repo.create(
                id=generate_id("product"),
                slug=platform_product.slug,
                name=platform_product.name,
                description=None,
                app_id=app_id,
                status="active",
                created_at=now,
                updated_at=now,
            )
            for platform_price in platform_product.prices:
                recurring_data = None
                if platform_price.billing_interval:
                    recurring_data = {
                        "interval": platform_price.billing_interval,
                        "interval_count": 1,
                    }
                await price_repo.create(
                    id=generate_id("price"),
                    product_id=product.id,
                    unit_amount=platform_price.unit_amount,
                    currency=platform_price.currency,
                    billing_interval=platform_price.billing_interval,
                    interval_count=1 if platform_price.billing_interval else None,
                    name=platform_price.name,
                    type="recurring" if platform_price.billing_interval else "one_time",
                    recurring=recurring_data,
                    status="active",
                    created_at=now,
                    updated_at=now,
                )

        await session.commit()


async def _ensure_audit_events_table(engine: object) -> None:
    """Create the append-only audit_events table for queryable client telemetry."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["audit_events"]],
                checkfirst=True,
            )
        )


async def _ensure_provisioning_tables(engine: object) -> None:
    """Create generic manifest-v1 tables and cut over legacy app recipes."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["provisioning_manifests"],
                    Base.metadata.tables["provisioning_manifest_revisions"],
                    Base.metadata.tables["provisioning_resources"],
                    Base.metadata.tables["provisioning_properties"],
                    Base.metadata.tables["provisioning_steps"],
                    Base.metadata.tables["provisioning_notes"],
                    Base.metadata.tables["provisioning_runs"],
                    Base.metadata.tables["provisioning_run_steps"],
                ],
                checkfirst=True,
            )
        )
        await conn.run_sync(ensure_provisioning_v1_cutover)


async def _ensure_onboarding_tables(engine: object) -> None:
    """Create standardized onboarding session and answer tables."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["onboarding_sessions"],
                    Base.metadata.tables["onboarding_answers"],
                ],
                checkfirst=True,
            )
        )


async def _ensure_user_app_enrollments_table(engine: object) -> None:
    """Create the user_app_enrollments table that tracks which apps each user has used."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["user_app_enrollments"]],
                checkfirst=True,
            )
        )


async def _ensure_subscriptions_table(engine: object) -> None:
    """Create the subscriptions table for org-to-app subscriptions."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["subscriptions"]],
                checkfirst=True,
            )
        )


async def _ensure_finance_provisioning_tables(engine: object) -> None:
    """Backfill subscription revisions and create the durable finance outbox."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(ensure_finance_provisioning_schema)
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["finance_provisioning_outbox"]],
                checkfirst=True,
            )
        )
        # Existing outbox tables predate run correlation. Add the nullable
        # column only after create_all has installed fresh tables.
        await conn.run_sync(ensure_finance_provisioning_schema)


async def _ensure_billing_customer_outbox_table(engine: object) -> None:
    """Create the durable Core-to-Billing customer outbox."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["billing_customer_outbox"]],
                checkfirst=True,
            )
        )


async def _ensure_user_identifications_table(engine: object) -> None:
    """Create the user_identifications table (sensitive verified identifiers)."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["user_identifications"]],
                checkfirst=True,
            )
        )


async def _ensure_subscription_items_table(engine: object) -> None:
    """Create the subscription_items table (line items on a subscription)."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[Base.metadata.tables["subscription_items"]],
                checkfirst=True,
            )
        )


async def _ensure_org_erm_tables(engine: object) -> None:
    """Create the org-structure/ERM tables (locations, departments, employees,
    contacts, user emails/mobile numbers)."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["org_locations"],
                    Base.metadata.tables["org_departments"],
                    Base.metadata.tables["employee_profiles"],
                    Base.metadata.tables["org_contacts"],
                    Base.metadata.tables["user_emails"],
                    Base.metadata.tables["user_mobile_numbers"],
                ],
                checkfirst=True,
            )
        )


async def _ensure_org_access_tables(engine: object) -> None:
    """Create the org roles/permissions + app-assignment tables and columns."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["organization_roles"],
                    Base.metadata.tables["app_assignments"],
                ],
                checkfirst=True,
            )
        )
        await conn.run_sync(ensure_invite_source_app_column)


async def _backfill_org_access(engine: object) -> None:
    """Provision existing orgs with default roles + Enterprise entitlement.

    Idempotent: seeds missing system roles per org, links memberships to their
    org role rows, and assigns active members to the Enterprise app. New orgs
    are provisioned inline at creation; this covers pre-framework rows.
    """
    from sqlalchemy.orm import joinedload

    from services.provisioning import (
        assign_member_apps,
        ensure_default_contact,
        link_membership_role,
        provision_organization,
    )

    async with AsyncSessionLocal() as session:
        now = now_unix_seconds()
        org_ids = (await session.scalars(sa_select(Organization.id).where(Organization.deleted_at.is_(None)))).all()
        for org_id in org_ids:
            await provision_organization(session, org_id, now)

        memberships = (await session.scalars(sa_select(Membership).where(Membership.status == "active"))).all()
        for membership in memberships:
            if membership.role_id is None:
                await link_membership_role(session, membership, now)
            await assign_member_apps(session, org_id=membership.organization_id, user_id=membership.user_id, now=now)

        # Orgs predating contacts get their active owner as the default
        # primary contact (ensure_default_contact is a no-op once any exists).
        owner_memberships = (
            await session.scalars(
                sa_select(Membership)
                .options(joinedload(Membership.user))
                .where(Membership.status == "active", Membership.role == "owner")
            )
        ).all()
        for membership in owner_memberships:
            if membership.user is not None:
                await ensure_default_contact(session, membership.organization_id, membership.user, now)

        await session.commit()


async def _ensure_feature_flag_tables(engine: object) -> None:
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["features"],
                    Base.metadata.tables["user_features"],
                    Base.metadata.tables["org_features"],
                    Base.metadata.tables["feature_flag_migration_archives"],
                ],
                checkfirst=True,
            )
        )
        await conn.run_sync(ensure_feature_flag_provider_columns)


def _check_session_secret(settings: Settings) -> None:
    """Refuse to start production without a real session-cookie secret.

    Without this, a production boot missing SESSION_COOKIE_SECRET resolves to
    an empty secret and every session endpoint 500s at request time — or, if
    IS_PRODUCTION is also unset, silently signs cookies with the publicly
    known dev fallback, making sessions forgeable. Failing at startup makes
    the misconfiguration impossible to miss.
    """
    configured = settings.session_cookie_secret or settings.workos_cookie_password
    if settings.is_production and not configured:
        raise RuntimeError(
            "SESSION_COOKIE_SECRET (or WORKOS_COOKIE_PASSWORD) must be set when "
            "IS_PRODUCTION=true — session cookies cannot be signed without it."
        )
    if configured and len(configured) < 32:
        logger.warning("session_secret.weak", length=len(configured))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = getattr(app.state, "settings", None) or get_settings()
    app.state.settings = settings
    _check_session_secret(settings)
    async with db_lifespan(app):
        worker_stop: asyncio.Event | None = None
        worker_task: asyncio.Task[None] | None = None
        billing_worker_task: asyncio.Task[None] | None = None
        if hasattr(app.state, "engine") and app.state.engine is not None:
            steps = (
                ("identity_tables", _seed_identity_tables),
                ("platform_apps", _seed_platform_apps),
                ("geo_regions", _seed_geo_regions),
                ("provisioning", _ensure_provisioning_tables),
                ("onboarding", _ensure_onboarding_tables),
                ("audit_events", _ensure_audit_events_table),
                ("user_app_enrollments", _ensure_user_app_enrollments_table),
                ("subscriptions", _ensure_subscriptions_table),
                ("finance_provisioning", _ensure_finance_provisioning_tables),
                ("billing_customer_outbox", _ensure_billing_customer_outbox_table),
                ("first_party_provisioning", seed_first_party_provisioning_manifests),
                ("billing_v2_cutover", _cut_over_billing_v2),
                ("org_erm_tables", _ensure_org_erm_tables),
                ("org_access_tables", _ensure_org_access_tables),
                ("feature_flag_tables", _ensure_feature_flag_tables),
                ("plan_module_tables", ensure_plan_module_tables),
                ("platform_products", _seed_platform_products),
                ("subscription_items", _ensure_subscription_items_table),
                ("console_features", seed_console_features),
                ("billing_features", seed_billing_features),
                ("couriers_features", seed_couriers_features),
                ("platform_widget_features", seed_platform_widget_features),
                ("platform_plan_modules", seed_platform_plan_modules),
                ("billing_plan_assignments", backfill_billing_plan_assignments),
                ("org_access_backfill", _backfill_org_access),
                ("user_identifications", _ensure_user_identifications_table),
            )
            logger.info("db.seed.started")
            for step_name, step_fn in steps:
                try:
                    await step_fn(app.state.engine)
                except Exception:
                    # Emit a structured event but DO NOT re-raise. In a
                    # serverless deployment this lifespan runs on every cold
                    # start; a transient DB failure here must not crash the
                    # entire ASGI app and take every route (including health
                    # and OAuth) down with it. Seeding is idempotent, so a
                    # later cold start will retry it.
                    logger.error("db.seed.failed", step=step_name, exc_info=True)
            logger.info("db.seed.completed")
            if settings.billing_url and settings.billing_internal_key:
                worker_stop = asyncio.Event()
                worker_task = asyncio.create_task(
                    run_finance_provisioning_worker(worker_stop, settings),
                    name="finance-provisioning-outbox",
                )
                billing_worker_task = asyncio.create_task(
                    run_billing_sync_worker(worker_stop, settings),
                    name="billing-customer-outbox",
                )
        try:
            yield
        finally:
            if worker_stop is not None:
                worker_stop.set()
            if worker_task is not None:
                worker_task.cancel()
                with suppress(asyncio.CancelledError):
                    await worker_task
            if billing_worker_task is not None:
                billing_worker_task.cancel()
                with suppress(asyncio.CancelledError):
                    await billing_worker_task


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(
        environment=active_settings.environment,
        log_level=active_settings.log_level,
    )

    if active_settings.sentry_dsn and _sentry_sdk is not None:
        _sentry_sdk.init(
            dsn=active_settings.sentry_dsn,
            environment=active_settings.environment,
            traces_sample_rate=0.1 if active_settings.is_production else 1.0,
            send_default_pii=False,
        )

    app = FastAPI(
        title="876 API",
        summary="FastAPI backend for the 876 platform.",
        description=(
            "The backend data plane for 876. It owns database access, provider "
            "server integrations, authentication dependencies, and documented "
            "HTTP contracts for the consumer and Console applications."
        ),
        version="0.1.0",
        contact={"name": "876 Engineering"},
        license_info={"name": "Private"},
        lifespan=lifespan,
        swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
        generate_unique_id_function=custom_generate_unique_id,
    )
    app.state.settings = active_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-876-API-Key",
            "X-Api-Key",
            "X-876-Realm",
            "X-Request-Id",
        ],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(APIEnvelopeMiddleware)

    @app.exception_handler(AppHTTPException)
    async def app_http_exception_handler(request: Request, exc: AppHTTPException) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                "app_error",
                code=exc.app_code,
                message=exc.app_message,
                status=exc.status_code,
                method=request.method,
                path=request.url.path,
                exc_info=True,
            )
        else:
            logger.warning(
                "app_client_error",
                code=exc.app_code,
                status=exc.status_code,
                method=request.method,
                path=request.url.path,
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.app_code, "message": exc.app_message}},
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.warning(
            "request_validation_error",
            method=request.method,
            path=request.url.path,
        )
        sanitized_errors = [{k: v for k, v in error.items() if k in ("loc", "msg", "type")} for error in exc.errors()]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation/invalid-request",
                    "message": "The request body or parameters failed validation.",
                    "details": sanitized_errors,
                }
            },
        )

    # Note: AppHTTPException subclasses HTTPException (which is StarletteHTTPException).
    # FastAPI dispatches to the most specific handler, so the AppHTTPException handler
    # still handles AppHTTPException and its subclasses, while this handler catches
    # any other (bare) HTTPExceptions.
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "error/not-found" if exc.status_code == 404 else "error/http"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": str(exc.detail)}},
        )

    app.include_router(api_router)
    setup_openapi(app)

    return app


app = create_app()
