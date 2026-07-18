from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from providers.workos.types._coerce import coerce_to_unix


class WorkosVaultSecret(BaseModel):
    """Placeholder — fill in fields as the WorkOS Vault API integration is built."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    object: Literal["vault_secret"] = "vault_secret"
    id: str
    name: str
    value: str | None = None
    created_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("created_at", "createdAt"),
    )
    updated_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("updated_at", "updatedAt"),
    )

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def _parse_ts(cls, v: Any) -> int | None:
        return coerce_to_unix(v)


class WorkosVaultSecretVersion(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str
    secret_id: str = Field(
        validation_alias=AliasChoices("secret_id", "secretId"),
    )
    version: int
    created_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("created_at", "createdAt"),
    )

    @field_validator("created_at", mode="before")
    @classmethod
    def _parse_ts(cls, v: Any) -> int | None:
        return coerce_to_unix(v)
