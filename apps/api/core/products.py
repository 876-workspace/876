"""Canonical registry of seeded subscription products + their prices.

Single source of truth for product/price-seeding, mirroring core/platform_apps.py.
A product's ``app_slug`` scopes it to one app (resolved to ``app_id`` at seed
time); a null ``app_slug`` would be a platform-wide product, reusable across
apps — none exist yet. Add a new product here, not inline in main.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class PlatformPrice:
    unit_amount: int
    currency: str
    billing_interval: str | None
    name: str | None = None


@dataclass(frozen=True)
class PlatformProduct:
    slug: str
    name: str
    app_slug: str | None
    prices: list[PlatformPrice] = field(default_factory=list)


PLATFORM_PRODUCTS: list[PlatformProduct] = [
    PlatformProduct(
        slug="876-billing-internal",
        name="876 Billing - internal",
        app_slug="876-billing",
        prices=[
            PlatformPrice(
                unit_amount=0,
                currency="jmd",
                billing_interval="month",
                name="Internal",
            )
        ],
    ),
    PlatformProduct(
        slug="876-couriers-free",
        name="Free",
        app_slug="876-couriers",
        prices=[
            PlatformPrice(
                unit_amount=0,
                currency="jmd",
                billing_interval=None,
                name="Free",
            )
        ],
    ),
    PlatformProduct(
        slug="876-couriers-pro",
        name="Pro",
        app_slug="876-couriers",
        prices=[
            PlatformPrice(
                unit_amount=4900,
                currency="jmd",
                billing_interval="month",
                name="Monthly",
            ),
            PlatformPrice(
                unit_amount=49000,
                currency="jmd",
                billing_interval="year",
                name="Yearly",
            ),
        ],
    ),
]
