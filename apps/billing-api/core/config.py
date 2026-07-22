from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.development", ".env"),
        extra="ignore",
        populate_by_name=True,
    )

    port: int = Field(default=4004, validation_alias="PORT")
    database_url: str = Field(default="", validation_alias="BILLING_DATABASE_URL")
    identity_api_url: str = Field(default="http://127.0.0.1:4000", validation_alias="API_URL")
    identity_api_key: str = Field(default="", validation_alias="BILLING_API_876_KEY")
    internal_key: str = Field(default="", validation_alias="BILLING_INTERNAL_KEY")
    scheduler_key: str = Field(default="", validation_alias="BILLING_SCHEDULER_KEY")
    cors_allowed_origins: str = Field(default="http://localhost:3004", validation_alias="CORS_ALLOWED_ORIGINS")
    environment: str = Field(default="production", validation_alias="ENVIRONMENT")
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")
    sentry_dsn: str = Field(default="", validation_alias="SENTRY_DSN")
    identity_timeout_seconds: float = Field(default=5.0, validation_alias="IDENTITY_API_TIMEOUT_SECONDS")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
