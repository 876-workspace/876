"""Canonical registry of first-party 876 platform apps.

Single source of truth for app-seeding. ``main.py`` (boot-time, idempotent)
and ``scripts/seed_internal.py`` (operational, one-off) both seed from this
list instead of maintaining their own — that drift is what produced
duplicate/divergent app rows (e.g. ``876-couriers`` missing from one path,
confidential ``*-svc`` clients only known to the other). Add a new
first-party app here, not in either seed script.

App kinds (``apps.app_kind``):

- ``internal``  — internally accessible tooling only; never surfaced to
  customers (Console).
- ``platform``  — first-party account/workspace surfaces without commercial
  plans (876 consumer, 876 Enterprise). Orgs manage their account — and the
  plans of *other* apps — from these, but the apps themselves are not sold.
- ``product``   — SaaS product lines sold with plans/subscriptions
  (876 Couriers; future Eats/Commerce).
- ``external``  — third-party developer apps registered through OAuth
  (the ``apps.app_kind`` column default).

Everything except ``external`` is first-party and skips OAuth consent.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from core.id import normalize_slug

APP_KINDS: tuple[str, ...] = ("internal", "platform", "product", "external")

FIRST_PARTY_APP_KINDS: frozenset[str] = frozenset({"internal", "platform", "product"})

CONSUMER_APP_SLUG = "876-consumer"
ENTERPRISE_APP_SLUG = "876-enterprise"
CONSOLE_APP_SLUG = "console"
COURIERS_APP_SLUG = "876-couriers"
BILLING_APP_SLUG = "876-billing"


@dataclass(frozen=True)
class PlatformApp:
    name: str
    slug: str
    app_kind: str
    homepage_url: str | None
    feature_prefix: str
    finance_dependency: Literal["none", "embedded"]
    finance_scopes: tuple[str, ...]
    api_key_env: str = "API_876_KEY"


PLATFORM_APPS: list[PlatformApp] = [
    PlatformApp(
        "876",
        CONSUMER_APP_SLUG,
        "platform",
        "https://876.app",
        "app",
        "none",
        (),
    ),
    PlatformApp(
        "876 Enterprise",
        ENTERPRISE_APP_SLUG,
        "platform",
        "https://enterprise.876.app",
        "enterprise",
        "none",
        (),
    ),
    PlatformApp("Console", CONSOLE_APP_SLUG, "internal", None, "console", "none", ()),
    PlatformApp(
        "876 Couriers",
        COURIERS_APP_SLUG,
        "product",
        "https://couriers.876.app",
        "couriers",
        "embedded",
        (
            "billing.customers.read",
            "billing.customers.write",
            "billing.items.read",
            "billing.items.write",
            "billing.invoices.read",
            "billing.invoices.write",
            "billing.payments.read",
            "billing.payments.write",
        ),
    ),
    PlatformApp(
        "876 Billing",
        BILLING_APP_SLUG,
        "product",
        "https://billing.876.app",
        "billing",
        "none",
        (),
        "BILLING_API_876_KEY",
    ),
]

_PLATFORM_APP_BY_SLUG = {app.slug: app for app in PLATFORM_APPS}


def get_platform_app(app_slug: str) -> PlatformApp | None:
    """Returns a first-party app definition by its persisted runtime slug."""
    return _PLATFORM_APP_BY_SLUG.get(app_slug)


def feature_prefix_for_app_slug(app_slug: str) -> str:
    """Returns the snake-case flag prefix assigned to an application slug."""
    platform_app = get_platform_app(app_slug)
    if platform_app is not None:
        return platform_app.feature_prefix

    return normalize_slug(app_slug.removeprefix("876-")).replace("-", "_")


def feature_slug_matches_app(feature_slug: str, app_slug: str) -> bool:
    """Whether a feature key is correctly scoped to the selected app."""
    prefix = feature_prefix_for_app_slug(app_slug)
    return bool(prefix) and feature_slug.startswith(f"{prefix}_")
