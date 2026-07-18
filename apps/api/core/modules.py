"""Canonical first-party application module registry.

Modules are stable commercial capabilities. ``feature_slug`` is optional and
only identifies the root operational flag that may stop rollout independently
of plan access.
"""

from dataclasses import dataclass

from core.platform_apps import BILLING_APP_SLUG, COURIERS_APP_SLUG


@dataclass(frozen=True)
class PlatformModule:
    app_slug: str
    key: str
    name: str
    description: str
    feature_slug: str | None
    position: int
    included_plan_slugs: tuple[str, ...] = ()


PLATFORM_MODULES: tuple[PlatformModule, ...] = (
    PlatformModule(
        BILLING_APP_SLUG,
        "sales",
        "Sales",
        "Quotes, estimates, invoices, payments, and credit notes.",
        "billing_sales",
        10,
        ("876-billing-internal",),
    ),
    PlatformModule(
        BILLING_APP_SLUG,
        "subscriptions",
        "Subscriptions",
        "Recurring plans, subscriptions, renewals, and generated invoices.",
        "billing_subscriptions",
        20,
        ("876-billing-internal",),
    ),
    PlatformModule(
        BILLING_APP_SLUG,
        "purchases",
        "Purchases",
        "Vendor and expense management.",
        "billing_purchases",
        30,
        ("876-billing-internal",),
    ),
    PlatformModule(
        BILLING_APP_SLUG,
        "banking",
        "Banking",
        "Bank accounts and transaction workflows.",
        "billing_banking",
        40,
        ("876-billing-internal",),
    ),
    PlatformModule(
        BILLING_APP_SLUG,
        "documents",
        "Documents",
        "Document storage and financial attachments.",
        "billing_documents",
        50,
        ("876-billing-internal",),
    ),
    PlatformModule(
        BILLING_APP_SLUG,
        "payroll",
        "Payroll",
        "Payroll setup, calculation, and payroll runs.",
        "billing_payroll",
        60,
        ("876-billing-internal",),
    ),
    PlatformModule(
        COURIERS_APP_SLUG,
        "delivery",
        "Delivery",
        "Courier delivery operations, shipping, and fulfillment settings.",
        None,
        10,
        ("876-couriers-free", "876-couriers-pro"),
    ),
)
