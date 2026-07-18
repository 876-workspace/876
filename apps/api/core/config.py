from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.development", ".env"),
        extra="ignore",
        populate_by_name=True,
    )

    port: int = Field(default=4000, validation_alias="PORT")
    workos_api_key: str = Field(default="", validation_alias="WORKOS_API_KEY")
    workos_client_id: str = Field(default="", validation_alias="WORKOS_CLIENT_ID")
    workos_redirect_uri: str = Field(
        default="",
        validation_alias="NEXT_PUBLIC_WORKOS_REDIRECT_URI",
    )
    workos_jwks_url_override: str = Field(default="", validation_alias="WORKOS_JWKS_URL")
    internal_key: str = Field(default="", validation_alias="API_INTERNAL_KEY")
    database_url: str = Field(default="", validation_alias="DATABASE_URL")
    cors_allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:3002",
        validation_alias="CORS_ALLOWED_ORIGINS",
    )
    enabled_social_providers: str = Field(
        default="google,apple,microsoft",
        validation_alias="ENABLED_SOCIAL_PROVIDERS",
    )
    oauth_issuer: str | None = Field(default=None, validation_alias="OAUTH_ISSUER")
    next_public_site_url: str | None = Field(default=None, validation_alias="NEXT_PUBLIC_SITE_URL")
    oauth_private_key: str | None = Field(default=None, validation_alias="OAUTH_PRIVATE_KEY")
    oauth_key_id: str | None = Field(default=None, validation_alias="OAUTH_KEY_ID")
    oauth_access_token_ttl_seconds: int = Field(
        default=3600,
        validation_alias="OAUTH_ACCESS_TOKEN_TTL_SECONDS",
    )
    oauth_refresh_token_ttl_seconds: int = Field(
        default=60 * 60 * 24 * 30,
        validation_alias="OAUTH_REFRESH_TOKEN_TTL_SECONDS",
    )
    session_cookie_name: str = Field(
        default="876-session",
        validation_alias="SESSION_COOKIE_NAME",
    )
    session_cookie_secret: str = Field(default="", validation_alias="SESSION_COOKIE_SECRET")
    workos_cookie_password: str = Field(default="", validation_alias="WORKOS_COOKIE_PASSWORD")
    is_production: bool = Field(default=False, validation_alias="IS_PRODUCTION")
    cookie_secure: bool | None = Field(default=None, validation_alias="COOKIE_SECURE")
    sentry_dsn: str = Field(default="", validation_alias="SENTRY_DSN")
    posthog_personal_api_key: str = Field(default="", validation_alias="POSTHOG_PERSONAL_API_KEY")
    posthog_project_id: int = Field(default=0, validation_alias="POSTHOG_PROJECT_ID")
    posthog_host: str = Field(default="https://us.i.posthog.com", validation_alias="POSTHOG_HOST")
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")
    environment: str = Field(default="production", validation_alias="ENVIRONMENT")
    deletion_mode: str = Field(default="hard", validation_alias="DELETION_MODE")
    # Email of the platform owner, seeded with the `owner` Console role
    # on first sight. Configurable so the owner is not hardcoded in code.
    platform_owner_email: str = Field(default="", validation_alias="PLATFORM_OWNER_EMAIL")

    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", validation_alias="STRIPE_WEBHOOK_SECRET")
    billing_url: str = Field(default="", validation_alias="BILLING_URL")
    billing_internal_key: str = Field(default="", validation_alias="BILLING_INTERNAL_KEY")
    billing_run_interval_seconds: int = Field(
        default=3600,
        validation_alias="BILLING_RUN_INTERVAL_SECONDS",
    )
    finance_provisioning_poll_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        validation_alias="FINANCE_PROVISIONING_POLL_SECONDS",
    )
    finance_provisioning_batch_size: int = Field(
        default=25,
        ge=1,
        le=100,
        validation_alias="FINANCE_PROVISIONING_BATCH_SIZE",
    )

    @property
    def is_owner_email_set(self) -> bool:
        return bool(self.platform_owner_email.strip())

    def is_owner_email(self, email: str | None) -> bool:
        """True when `email` is the configured platform-owner address."""
        if not email or not self.platform_owner_email.strip():
            return False
        return email.strip().lower() == self.platform_owner_email.strip().lower()

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def social_providers(self) -> list[str]:
        return [p.strip() for p in self.enabled_social_providers.split(",") if p.strip()]

    @property
    def workos_jwks_url(self) -> str:
        if self.workos_jwks_url_override:
            return self.workos_jwks_url_override
        return f"https://api.workos.com/sso/jwks/{self.workos_client_id}"

    @property
    def resolved_session_cookie_secret(self) -> str:
        configured_secret = self.session_cookie_secret or self.workos_cookie_password
        if configured_secret:
            return configured_secret

        if not self.is_production:
            return "dev-only-session-cookie-secret-change-before-production"

        return ""

    @property
    def resolved_cookie_secure(self) -> bool:
        """Whether to set the Secure flag on session cookies.

        Defaults to is_production but can be overridden via COOKIE_SECURE=true
        for dev environments served over HTTPS (e.g. Gitpod, Codespaces).
        """
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.is_production


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def is_platform_owner_email(email: str | None) -> bool:
    """Whether ``email`` is the configured platform owner (``PLATFORM_OWNER_EMAIL``).

    The platform owner is configured via env, never hard-coded in source.
    Comparison is case-insensitive. Returns ``False`` when no owner email is
    configured or ``email`` is empty.
    """
    owner = get_settings().platform_owner_email.strip().lower()
    return bool(owner) and (email or "").strip().lower() == owner
