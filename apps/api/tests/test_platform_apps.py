from core.platform_apps import (
    BILLING_APP_SLUG,
    CONSUMER_APP_SLUG,
    COURIERS_APP_SLUG,
    feature_prefix_for_app_slug,
    feature_slug_matches_app,
    get_platform_app,
)


def test_first_party_feature_prefixes_are_explicit() -> None:
    assert feature_prefix_for_app_slug(CONSUMER_APP_SLUG) == "app"
    assert feature_prefix_for_app_slug(BILLING_APP_SLUG) == "billing"
    assert feature_slug_matches_app("couriers_route_optimizer", COURIERS_APP_SLUG)
    assert not feature_slug_matches_app("billing_route_optimizer", COURIERS_APP_SLUG)


def test_external_app_feature_prefix_is_derived_from_persisted_slug() -> None:
    assert feature_prefix_for_app_slug("876-market-place") == "market_place"


def test_couriers_declares_its_exact_embedded_finance_contract() -> None:
    couriers = get_platform_app(COURIERS_APP_SLUG)

    assert couriers is not None
    assert couriers.finance_dependency == "embedded"
    assert couriers.finance_scopes == (
        "billing.customers.read",
        "billing.customers.write",
        "billing.items.read",
        "billing.items.write",
        "billing.invoices.read",
        "billing.invoices.write",
        "billing.payments.read",
        "billing.payments.write",
    )
