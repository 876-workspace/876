from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from providers.workos.types._coerce import coerce_to_unix


class WorkosOrganizationDomain(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str
    domain: str
    state: str | None = None
    organization_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("organization_id", "organizationId"),
    )


class WorkosOrganization(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    object: Literal["organization"] = "organization"
    id: str
    name: str
    allow_profiles_outside_organization: bool | None = Field(
        default=None,
        validation_alias=AliasChoices("allow_profiles_outside_organization", "allowProfilesOutsideOrganization"),
    )
    domains: list[WorkosOrganizationDomain] = Field(default_factory=list)
    external_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("external_id", "externalId"),
    )
    metadata: dict[str, Any] | None = None
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


class WorkosOrganizationMembership(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    object: Literal["organization_membership"] = "organization_membership"
    id: str
    user_id: str = Field(validation_alias=AliasChoices("user_id", "userId"))
    organization_id: str = Field(
        validation_alias=AliasChoices("organization_id", "organizationId"),
    )
    role: dict[str, Any] | None = None
    status: str
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
