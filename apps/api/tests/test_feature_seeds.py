from core.platform_apps import BILLING_APP_SLUG, COURIERS_APP_SLUG
from services.feature_seeds import FEATURE_SEEDS_BY_APP, _validate_feature_seeds


def test_billing_product_feature_seeds_define_expected_groups() -> None:
    seeds = FEATURE_SEEDS_BY_APP[BILLING_APP_SLUG]
    seeds_by_slug = {seed["slug"]: seed for seed in seeds}

    assert seeds_by_slug["billing_sales_quotes"]["parent_slug"] == "billing_sales"
    assert seeds_by_slug["billing_sales_invoices"]["parent_slug"] == "billing_sales"
    assert seeds_by_slug["billing_purchases_vendors"]["parent_slug"] == "billing_purchases"
    assert seeds_by_slug["billing_purchases_expenses"]["parent_slug"] == "billing_purchases"
    assert "parent_slug" not in seeds_by_slug["billing_subscriptions"]
    assert "parent_slug" not in seeds_by_slug["billing_banking"]
    assert "parent_slug" not in seeds_by_slug["billing_documents"]
    assert "parent_slug" not in seeds_by_slug["billing_org_switcher"]

    _validate_feature_seeds(BILLING_APP_SLUG, seeds)


def test_unimplemented_billing_destinations_start_disabled() -> None:
    seeds_by_slug = {seed["slug"]: seed for seed in FEATURE_SEEDS_BY_APP[BILLING_APP_SLUG]}

    assert seeds_by_slug["billing_purchases"]["default_enabled"] is False
    assert seeds_by_slug["billing_purchases_vendors"]["default_enabled"] is False
    assert seeds_by_slug["billing_purchases_expenses"]["default_enabled"] is False
    assert seeds_by_slug["billing_banking"]["default_enabled"] is False
    assert seeds_by_slug["billing_documents"]["default_enabled"] is False


def test_notepad_seed_preserves_the_legacy_notes_flag_identity() -> None:
    seeds_by_slug = {seed["slug"]: seed for seed in FEATURE_SEEDS_BY_APP[BILLING_APP_SLUG]}

    assert seeds_by_slug["billing_widgets_notepad"]["legacy_slugs"] == ["billing_widgets_notes"]
    assert seeds_by_slug["billing_widgets_notepad"]["tags"] == ["widget"]


def test_couriers_feature_seeds_define_expected_groups() -> None:
    seeds = FEATURE_SEEDS_BY_APP[COURIERS_APP_SLUG]
    seeds_by_slug = {seed["slug"]: seed for seed in seeds}

    assert seeds_by_slug["couriers_widgets"]["name"] == "Widgets"
    assert seeds_by_slug["couriers_widgets_notepad"]["parent_slug"] == "couriers_widgets"
    assert seeds_by_slug["couriers_widgets_notepad"]["tags"] == ["widget"]
    assert seeds_by_slug["couriers_operations"]["name"] == "Operations"
    assert seeds_by_slug["couriers_operations_packages"]["parent_slug"] == "couriers_operations"
    assert seeds_by_slug["couriers_operations_customers"]["parent_slug"] == "couriers_operations"
    assert seeds_by_slug["couriers_operations_items"]["parent_slug"] == "couriers_operations"
    for standalone_slug in (
        "couriers_search_bar",
        "couriers_theme_switcher",
        "couriers_global_add",
        "couriers_app_switcher",
        "couriers_org_switcher",
    ):
        assert "parent_slug" not in seeds_by_slug[standalone_slug]

    _validate_feature_seeds(COURIERS_APP_SLUG, seeds)
