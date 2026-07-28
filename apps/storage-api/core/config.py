from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.development", ".env"),
        extra="ignore",
        populate_by_name=True,
    )

    port: int = Field(default=4005, validation_alias="PORT")
    database_url: str = Field(default="", validation_alias="STORAGE_DATABASE_URL")
    internal_key: str = Field(default="", validation_alias="STORAGE_INTERNAL_KEY")
    scheduler_key: str = Field(default="", validation_alias="STORAGE_SCHEDULER_KEY")
    r2_account_id: str = Field(default="", validation_alias="R2_ACCOUNT_ID")
    r2_access_key_id: str = Field(default="", validation_alias="R2_ACCESS_KEY_ID")
    r2_secret_access_key: str = Field(default="", validation_alias="R2_SECRET_ACCESS_KEY")
    r2_assets_bucket: str = Field(default="", validation_alias="R2_ASSETS_BUCKET")
    r2_files_bucket: str = Field(default="", validation_alias="R2_FILES_BUCKET")
    r2_endpoint: str = Field(default="", validation_alias="R2_ENDPOINT")
    r2_assets_base_url: str = Field(default="", validation_alias="R2_ASSETS_BASE_URL")
    upload_ttl_seconds: int = Field(default=600, validation_alias="STORAGE_UPLOAD_TTL_SECONDS")
    default_org_limit_bytes: int = Field(
        default=5_368_709_120,
        ge=0,
        validation_alias="STORAGE_DEFAULT_ORG_LIMIT_BYTES",
    )
    near_limit_percent: int = Field(
        default=80,
        ge=0,
        le=100,
        validation_alias="STORAGE_NEAR_LIMIT_PERCENT",
    )
    deletion_mode: Literal["soft", "hard"] = Field(default="soft", validation_alias="DELETION_MODE")
    environment: str = Field(default="production", validation_alias="ENVIRONMENT")
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")
    cors_allowed_origins: str = Field(default="", validation_alias="CORS_ALLOWED_ORIGINS")
    sentry_dsn: str = Field(default="", validation_alias="SENTRY_DSN")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
