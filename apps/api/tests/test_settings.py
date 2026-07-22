from core.config import Settings


def test_settings_parse_cors_origins_from_csv() -> None:
    settings = Settings(
        workos_api_key="test-key",
        workos_client_id="client_123",
        workos_redirect_uri="http://localhost:3000/callback",
        cors_allowed_origins="http://localhost:3000, http://localhost:3002",
    )

    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://localhost:3002",
    ]


def test_settings_default_workos_jwks_url_uses_client_id() -> None:
    settings = Settings(
        workos_api_key="test-key",
        workos_client_id="client_123",
        workos_redirect_uri="http://localhost:3000/callback",
    )

    assert settings.workos_jwks_url == "https://api.workos.com/sso/jwks/client_123"


def test_billing_api_url_takes_precedence_over_legacy_billing_url(monkeypatch) -> None:
    monkeypatch.setenv("BILLING_API_URL", "http://billing-api:4004")
    monkeypatch.setenv("BILLING_URL", "http://billing-ui:3004")

    settings = Settings(_env_file=None)

    assert settings.billing_url == "http://billing-api:4004"
