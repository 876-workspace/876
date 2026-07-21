from __future__ import annotations

from typing import NotRequired, TypedDict

from sqlalchemy import select as sa_select

from core.config import get_settings
from core.logging import get_logger
from core.platform_apps import (
    BILLING_APP_SLUG,
    CONSOLE_APP_SLUG,
    COURIERS_APP_SLUG,
    feature_slug_matches_app,
)
from core.timestamps import now_unix_seconds
from db.models import Feature as FeatureModel
from db.models import FeatureFlagMigrationArchive
from db.repositories.apps import AppRepository
from db.repositories.features import FeatureRepository
from db.session import AsyncSessionLocal
from providers.posthog.client import get_posthog_client

logger = get_logger(__name__)


class FeatureSeed(TypedDict):
    slug: str
    name: str
    description: str
    parent_slug: NotRequired[str]
    default_enabled: NotRequired[bool]
    tags: NotRequired[list[str]]
    legacy_slugs: NotRequired[list[str]]


PLATFORM_FEATURE_SEEDS: list[FeatureSeed] = [
    {
        "slug": "platform_widgets",
        "name": "Shared widgets",
        "description": "Global master switch for widgets shared across 876 apps.",
        "tags": ["widget"],
    },
    {
        "slug": "platform_widgets_notepad",
        "name": "Shared Notepad widget",
        "description": "Global switch for the account-owned Notepad widget.",
        "parent_slug": "platform_widgets",
        "tags": ["widget"],
        "legacy_slugs": ["platform_widgets_notes"],
    },
]


FEATURE_SEEDS_BY_APP: dict[str, list[FeatureSeed]] = {
    CONSOLE_APP_SLUG: [
        {
            "slug": "console_widgets",
            "name": "Widgets",
            "description": "Master switch for the Console widget rail.",
            "tags": ["widget"],
        },
        {
            "slug": "console_widgets_notepad",
            "name": "Notepad widget",
            "description": "Controls access to the Console Notepad widget.",
            "parent_slug": "console_widgets",
            "tags": ["widget"],
            "legacy_slugs": ["console_widgets_notes"],
        },
        {
            "slug": "console_widgets_live_logs",
            "name": "Live logs widget",
            "description": "Controls access to the Console Live logs widget.",
            "parent_slug": "console_widgets",
            "tags": ["widget"],
        },
        {
            "slug": "console_notifications",
            "name": "Notifications",
            "description": "Master switch for Console notification channels.",
        },
        {
            "slug": "console_notifications_email_alerts",
            "name": "Email alerts",
            "description": "Controls access to Console email notification channels.",
            "parent_slug": "console_notifications",
        },
        {
            "slug": "console_notifications_slack",
            "name": "Slack notifications",
            "description": "Controls access to Console Slack notification channels.",
            "parent_slug": "console_notifications",
        },
        {
            "slug": "console_notifications_webhooks",
            "name": "Webhook notifications",
            "description": "Controls access to Console webhook notification channels.",
            "parent_slug": "console_notifications",
        },
        {
            "slug": "console_theme_switcher",
            "name": "Theme switcher",
            "description": "Controls access to the Console theme switcher.",
        },
        {
            "slug": "console_global_add",
            "name": "Global add",
            "description": "Controls access to the Console global add menu.",
        },
        {
            "slug": "console_app_switcher",
            "name": "App switcher",
            "description": "Controls access to the Console app switcher.",
        },
        {
            "slug": "console_search_bar",
            "name": "Search bar",
            "description": "Controls access to the Console search bar.",
        },
        {
            "slug": "console_chat",
            "name": "876 Chat",
            "description": "Master switch for the 876 Chat rail in Console.",
            "default_enabled": True,
        },
    ],
    COURIERS_APP_SLUG: [
        {
            "slug": "couriers_widgets",
            "name": "Widgets",
            "description": "Master switch for the Couriers widget rail.",
            "tags": ["widget"],
        },
        {
            "slug": "couriers_widgets_notepad",
            "name": "Notepad widget",
            "description": "Controls access to the shared Notepad widget in Couriers.",
            "parent_slug": "couriers_widgets",
            "tags": ["widget"],
        },
        {
            "slug": "couriers_chat",
            "name": "876 Chat",
            "description": "Master switch for the 876 Chat rail in Couriers.",
            "default_enabled": True,
        },
        {
            "slug": "couriers_theme_switcher",
            "name": "Theme switcher",
            "description": "Light/dark appearance toggle in the account menu.",
        },
        {
            "slug": "couriers_global_add",
            "name": "Global add",
            "description": "Universal create button in the top nav.",
        },
        {
            "slug": "couriers_app_switcher",
            "name": "App switcher",
            "description": "876 app launcher in the top nav.",
        },
        {
            "slug": "couriers_search_bar",
            "name": "Search bar",
            "description": "Global search bar in the Couriers top nav.",
        },
        {
            "slug": "couriers_org_switcher",
            "name": "Org switcher",
            "description": "Organization switcher in the top nav.",
        },
        {
            "slug": "couriers_operations",
            "name": "Operations",
            "description": "Master switch for Couriers operations areas.",
        },
        {
            "slug": "couriers_operations_packages",
            "name": "Packages",
            "description": "Controls access to Couriers packages.",
            "parent_slug": "couriers_operations",
        },
        {
            "slug": "couriers_operations_customers",
            "name": "Customers",
            "description": "Controls access to Couriers customers.",
            "parent_slug": "couriers_operations",
        },
        {
            "slug": "couriers_operations_items",
            "name": "Items",
            "description": "Controls access to Couriers items.",
            "parent_slug": "couriers_operations",
        },
    ],
    BILLING_APP_SLUG: [
        {
            "slug": "billing_widgets",
            "name": "Widgets",
            "description": "Master switch for the Billing widget rail.",
            "tags": ["widget"],
        },
        {
            "slug": "billing_widgets_notepad",
            "name": "Notepad widget",
            "description": "Controls access to the shared Notepad widget in Billing.",
            "parent_slug": "billing_widgets",
            "tags": ["widget"],
            "legacy_slugs": ["billing_widgets_notes"],
        },
        {
            "slug": "billing_chat",
            "name": "876 Chat",
            "description": "Master switch for the 876 Chat rail in Billing.",
            "default_enabled": True,
        },
        {
            "slug": "billing_sales",
            "name": "Sales",
            "description": "Master switch for Billing sales documents.",
        },
        {
            "slug": "billing_sales_quotes",
            "name": "Quotes",
            "description": "Controls access to Billing quotes.",
            "parent_slug": "billing_sales",
        },
        {
            "slug": "billing_sales_invoices",
            "name": "Invoices",
            "description": "Controls access to Billing invoices.",
            "parent_slug": "billing_sales",
        },
        {
            "slug": "billing_subscriptions",
            "name": "Subscriptions",
            "description": "Controls access to Billing subscription management.",
        },
        {
            "slug": "billing_purchases",
            "name": "Purchases",
            "description": "Master switch for Billing purchase management.",
            "default_enabled": False,
        },
        {
            "slug": "billing_purchases_vendors",
            "name": "Vendors",
            "description": "Controls access to Billing vendors.",
            "parent_slug": "billing_purchases",
            "default_enabled": False,
        },
        {
            "slug": "billing_purchases_expenses",
            "name": "Expenses",
            "description": "Controls access to Billing expenses.",
            "parent_slug": "billing_purchases",
            "default_enabled": False,
        },
        {
            "slug": "billing_banking",
            "name": "Banking",
            "description": "Controls access to Billing banking.",
            "default_enabled": False,
        },
        {
            "slug": "billing_documents",
            "name": "Documents",
            "description": "Controls access to Billing documents.",
            "default_enabled": False,
        },
        {
            "slug": "billing_payroll",
            "name": "Payroll",
            "description": "Controls access to Billing payroll.",
            "default_enabled": False,
        },
        {
            "slug": "billing_theme_switcher",
            "name": "Theme switcher",
            "description": "Controls access to the Billing theme switcher.",
            "default_enabled": False,
        },
        {
            "slug": "billing_global_add",
            "name": "Global add",
            "description": "Controls access to the Billing global add menu.",
        },
        {
            "slug": "billing_app_switcher",
            "name": "App switcher",
            "description": "Controls access to the Billing app switcher.",
        },
        {
            "slug": "billing_search_bar",
            "name": "Search bar",
            "description": "Controls access to the Billing search bar.",
        },
        {
            "slug": "billing_org_switcher",
            "name": "Org switcher",
            "description": "Organization switcher in the top nav.",
        },
    ],
}


def _validate_feature_seeds(app_slug: str | None, feature_seeds: list[FeatureSeed]) -> None:
    seen: set[str] = set()
    for feature_seed in feature_seeds:
        slug = feature_seed["slug"]
        if app_slug and not feature_slug_matches_app(slug, app_slug):
            raise ValueError(f"Feature slug {slug!r} is not scoped to app {app_slug!r}.")
        if app_slug is None and not slug.startswith("platform_"):
            raise ValueError(f"Platform feature slug {slug!r} must start with 'platform_'.")

        parent_slug = feature_seed.get("parent_slug")
        if parent_slug is not None:
            if parent_slug not in seen:
                raise ValueError(f"Feature parent {parent_slug!r} must be seeded before {slug!r}.")
            if not slug.startswith(f"{parent_slug}_"):
                raise ValueError(f"Feature child {slug!r} must extend parent key {parent_slug!r}.")
        seen.add(slug)


async def _seed_app_features(
    _engine: object,
    *,
    app_slug: str,
    feature_seeds: list[FeatureSeed],
) -> None:
    _validate_feature_seeds(app_slug, feature_seeds)
    await _seed_posthog_features(
        app_slug=app_slug,
        feature_seeds=feature_seeds,
    )


async def _seed_posthog_features(
    *,
    app_slug: str | None,
    feature_seeds: list[FeatureSeed],
) -> None:
    scope_label = app_slug or "platform"
    settings = get_settings()
    if not (settings.posthog_personal_api_key and settings.posthog_project_id and settings.posthog_host):
        logger.info("features.seed.skipped", app_slug=scope_label, reason="posthog_not_configured")
        return

    async with AsyncSessionLocal() as session:
        app = await AppRepository(session).get_by_slug(app_slug) if app_slug else None
        if app_slug and app is None:
            logger.info("features.seed.skipped", app_slug=app_slug, reason="app_missing")
            return

        legacy_feature = (
            await session.scalars(sa_select(FeatureModel).where(FeatureModel.provider != "posthog").limit(1))
        ).first()
        completed_archive = (
            await session.scalars(
                sa_select(FeatureFlagMigrationArchive).where(FeatureFlagMigrationArchive.status == "completed").limit(1)
            )
        ).first()
        if legacy_feature is not None and completed_archive is None:
            logger.error(
                "features.seed.skipped",
                app_slug=scope_label,
                reason="provider_snapshot_required",
            )
            return

        posthog = get_posthog_client(settings)
        provider_features = {str(row.get("key")): row for row in await posthog.list_features()}
        repo = FeatureRepository(session)
        feature_ids_by_slug: dict[str, str] = {}

        for feature_seed in feature_seeds:
            provider_feature = provider_features.get(feature_seed["slug"])
            if provider_feature is None:
                for legacy_slug in feature_seed.get("legacy_slugs", []):
                    legacy_provider_feature = provider_features.get(legacy_slug)
                    if legacy_provider_feature is None:
                        continue
                    provider_feature = await posthog.update_feature(
                        str(legacy_provider_feature["id"]),
                        key=feature_seed["slug"],
                        description=feature_seed["description"],
                    )
                    provider_features.pop(legacy_slug, None)
                    provider_features[feature_seed["slug"]] = provider_feature
                    logger.info(
                        "features.seed.provider_key_migrated",
                        app_slug=scope_label,
                        legacy_slug=legacy_slug,
                        slug=feature_seed["slug"],
                        provider_feature_id=str(provider_feature["id"]),
                    )
                    break
            if provider_feature is None:
                provider_feature = await posthog.create_feature(
                    key=feature_seed["slug"],
                    name=feature_seed["name"],
                    description=feature_seed["description"],
                    enabled=feature_seed.get("default_enabled", True),
                )
                provider_features[feature_seed["slug"]] = provider_feature

            parent_slug = feature_seed.get("parent_slug")
            parent_feature_id = feature_ids_by_slug.get(parent_slug) if parent_slug else None
            provider_feature_id = str(provider_feature["id"])
            existing = await repo.get_by_slug(feature_seed["slug"])
            if existing is None:
                for legacy_slug in feature_seed.get("legacy_slugs", []):
                    existing = await repo.get_by_slug(legacy_slug)
                    if existing is None:
                        continue
                    existing.slug = feature_seed["slug"]
                    logger.info(
                        "features.seed.local_key_migrated",
                        app_slug=scope_label,
                        feature_id=existing.id,
                        legacy_slug=legacy_slug,
                        slug=feature_seed["slug"],
                    )
                    break
            now = now_unix_seconds()

            if existing is None:
                feature = await repo.create(
                    provider="posthog",
                    provider_feature_id=provider_feature_id,
                    provider_environment_id=str(settings.posthog_project_id),
                    slug=feature_seed["slug"],
                    name=feature_seed["name"],
                    description=feature_seed["description"],
                    enabled=bool(provider_feature.get("active", False)),
                    scope="global",
                    consumer_default_enabled=False,
                    default_value=(
                        feature_seed.get("default_enabled", True) if "widget" in feature_seed.get("tags", []) else False
                    ),
                    app_id=app.id if app else None,
                    parent_feature_id=parent_feature_id,
                    tags=sorted(
                        set(feature_seed.get("tags", [])) | {str(tag) for tag in provider_feature.get("tags", [])}
                    ),
                    server_side_only=True,
                    provider_metadata=provider_feature,
                )
                event = "features.seed.created"
            else:
                existing.provider = "posthog"
                existing.provider_feature_id = provider_feature_id
                existing.provider_environment_id = str(settings.posthog_project_id)
                existing.app_id = app.id if app else None
                existing.parent_feature_id = parent_feature_id
                existing.name = feature_seed["name"]
                existing.description = feature_seed["description"]
                existing.enabled = bool(provider_feature.get("active", False))
                if "widget" in feature_seed.get("tags", []):
                    existing.default_value = feature_seed.get("default_enabled", True)
                existing.tags = sorted(set(existing.tags) | set(feature_seed.get("tags", [])))
                existing.provider_metadata = provider_feature
                existing.synced_at = now
                existing.updated_at = now
                feature = existing
                event = "features.seed.synced"

            feature_ids_by_slug[feature_seed["slug"]] = feature.id
            logger.info(
                event,
                app_slug=scope_label,
                feature_id=feature.id,
                slug=feature.slug,
                provider="posthog",
                provider_feature_id=provider_feature_id,
            )

        await session.commit()


async def seed_console_features(engine: object) -> None:
    """Ensures Console feature flags exist in PostHog and the local catalog."""
    await _seed_app_features(
        engine,
        app_slug=CONSOLE_APP_SLUG,
        feature_seeds=FEATURE_SEEDS_BY_APP[CONSOLE_APP_SLUG],
    )


async def seed_billing_features(engine: object) -> None:
    """Ensures Billing feature flags exist in PostHog and the local catalog."""
    await _seed_app_features(
        engine,
        app_slug=BILLING_APP_SLUG,
        feature_seeds=FEATURE_SEEDS_BY_APP[BILLING_APP_SLUG],
    )


async def seed_couriers_features(engine: object) -> None:
    """Ensures Couriers feature flags exist in PostHog and the local catalog."""
    await _seed_app_features(
        engine,
        app_slug=COURIERS_APP_SLUG,
        feature_seeds=FEATURE_SEEDS_BY_APP[COURIERS_APP_SLUG],
    )


async def seed_platform_widget_features(_engine: object) -> None:
    """Ensures platform-wide shared widget switches exist in PostHog and the catalog."""
    _validate_feature_seeds(None, PLATFORM_FEATURE_SEEDS)
    await _seed_posthog_features(
        app_slug=None,
        feature_seeds=PLATFORM_FEATURE_SEEDS,
    )
