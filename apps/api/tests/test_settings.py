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
