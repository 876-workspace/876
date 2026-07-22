from core.config import Settings
from scripts.check_environment import missing_production_settings


def test_environment_check_reports_names_without_secret_values() -> None:
    settings = Settings(
        identity_api_url="",
        identity_api_key="",
        database_url="postgresql://example.invalid/billing",
        internal_key="configured",
        cors_allowed_origins="",
    )

    assert missing_production_settings(settings) == [
        "API_URL",
        "BILLING_API_876_KEY",
        "CORS_ALLOWED_ORIGINS",
    ]


def test_environment_check_accepts_shadow_writer_mode() -> None:
    settings = Settings(
        identity_api_url="http://876-api.railway.internal",
        identity_api_key="configured",
        database_url="postgresql://example.invalid/billing",
        internal_key="configured",
        cors_allowed_origins="https://billing.example.com",
        billing_writer="none",
    )

    assert missing_production_settings(settings) == []


def test_environment_check_rejects_production_localhost_defaults() -> None:
    settings = Settings(
        identity_api_key="configured",
        database_url="postgresql://example.invalid/billing",
        internal_key="configured",
    )

    assert missing_production_settings(settings) == ["API_URL", "CORS_ALLOWED_ORIGINS"]
