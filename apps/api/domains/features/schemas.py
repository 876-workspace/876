from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class FeatureResponse(BaseModel):
    object: Literal["feature"] = Field(
        default="feature",
        description="String representing the object's type. Always 'feature'.",
    )
    id: str = Field(description="Unique identifier for the feature.")
    provider: str = Field(description="Feature flag provider backing this feature.", examples=["posthog"])
    provider_feature_id: str | None = Field(default=None, description="Provider-native feature identifier.")
    provider_environment_id: str | None = Field(default=None, description="Provider-native environment identifier.")
    slug: str = Field(
        description="URL-safe unique identifier for the feature.",
        examples=["dark-mode"],
    )
    name: str = Field(
        description="Human-readable name for the feature.",
        examples=["Dark Mode"],
    )
    description: str | None = Field(default=None, description="Human-readable description of the feature.")
    tags: list[str] = Field(default_factory=list, description="Tags associated with this feature.")
    enabled: bool = Field(description="Whether this feature is globally enabled.")
    default_value: bool = Field(description="The default value for this feature flag.")
    value_type: str | None = Field(default=None, description="Remote config value type, if configured.")
    value: Any | None = Field(default=None, description="Remote config value returned with the flag.")
    server_side_only: bool = Field(description="Whether this flag should only be evaluated server-side.")
    archived_at: int | None = Field(
        default=None,
        description="Time at which the feature was archived, or null when active.",
    )
    parent_feature_id: str | None = Field(
        default=None,
        description="ID of the parent feature flag, or null for solo/root flags.",
    )
    provider_metadata: dict[str, Any] | None = Field(
        default=None,
        description="Raw provider metadata used for reconciliation/debugging.",
    )
    consumer_default_enabled: bool = Field(
        description="Whether this feature is enabled by default for consumer accounts."
    )
    scope: str = Field(
        description="The feature's scope.",
        examples=["consumer", "enterprise", "global"],
    )
    app_id: str | None = Field(
        default=None,
        description="ID of the app this feature belongs to, or null for platform-wide flags.",
    )
    synced_at: int = Field(
        description="Time at which provider state was last reconciled. Measured in seconds since the Unix epoch."
    )
    created_at: int = Field(
        description="Time at which the feature record was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the feature record was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "feature",
                    "id": "feat_01HFNPGM9K",
                    "provider": "posthog",
                    "provider_feature_id": "12345",
                    "provider_environment_id": "67890",
                    "slug": "dark-mode",
                    "name": "Dark Mode",
                    "description": None,
                    "tags": [],
                    "enabled": True,
                    "default_value": False,
                    "value_type": None,
                    "value": None,
                    "server_side_only": True,
                    "archived_at": None,
                    "parent_feature_id": None,
                    "provider_metadata": None,
                    "consumer_default_enabled": False,
                    "scope": "consumer",
                    "app_id": None,
                    "synced_at": 1700000000,
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )


class FeatureUpdate(BaseModel):
    description: str | None = Field(default=None, description="Human-readable description.")
    enabled: bool | None = Field(default=None, description="Whether the flag is globally enabled.")
    app_id: str | None = Field(default=None, description="App this flag belongs to.")
    tags: list[str] | None = Field(default=None, description="Tags associated with this feature.")
    consumer_default_enabled: bool | None = Field(
        default=None,
        description="Whether this feature is enabled by default for consumer accounts.",
    )
    scope: str | None = Field(
        default=None,
        description="The feature's scope. One of: consumer, enterprise, global.",
        examples=["consumer", "enterprise", "global"],
    )
    default_value: bool | None = Field(
        default=None,
        description="The default value for this feature flag.",
    )
    value_type: str | None = Field(default=None, description="Remote config value type, if configured.")
    value: Any | None = Field(default=None, description="Remote config value returned with the flag.")
    server_side_only: bool | None = Field(
        default=None,
        description="Whether this flag should only be evaluated server-side.",
    )
    archived: bool | None = Field(default=None, description="Whether this feature is archived.")
    parent_feature_id: str | None = Field(
        default=None,
        description="ID of the parent feature flag. Set null to make this a root flag.",
    )

    model_config = ConfigDict(populate_by_name=True)


class UserFeatureResponse(BaseModel):
    object: Literal["user_feature"] = Field(
        default="user_feature",
        description="String representing the object's type. Always 'user_feature'.",
    )
    id: str = Field(description="Unique identifier for the user feature grant.")
    user_id: str = Field(description="Unique identifier for the user.")
    feature_id: str = Field(description="Unique identifier for the feature.")
    slug: str = Field(description="Slug of the feature.")
    status: str = Field(
        description="The feature grant status for this user.",
        examples=["enabled", "disabled"],
    )
    note: str | None = Field(
        default=None,
        description="Optional note explaining the reason for this grant.",
    )
    synced_at: int = Field(
        description="Time at which the grant was last synced. Measured in seconds since the Unix epoch."
    )
    created_at: int = Field(
        description="Time at which the grant was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the grant was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "user_feature",
                    "id": "uf_01HFNPGM9K",
                    "user_id": "usr_01HFNPGM9K",
                    "feature_id": "feat_01HFNPGM9K",
                    "slug": "dark-mode",
                    "status": "enabled",
                    "note": None,
                    "synced_at": 1700000000,
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )


class OrgFeatureResponse(BaseModel):
    object: Literal["org_feature"] = Field(
        default="org_feature",
        description="String representing the object's type. Always 'org_feature'.",
    )
    id: str = Field(description="Unique identifier for the organization feature grant.")
    organization_id: str = Field(description="Unique identifier for the organization.")
    feature_id: str = Field(description="Unique identifier for the feature.")
    slug: str = Field(description="Slug of the feature.")
    status: str = Field(
        description="The feature grant status for this organization.",
        examples=["enabled", "disabled"],
    )
    note: str | None = Field(
        default=None,
        description="Optional note explaining the reason for this grant.",
    )
    synced_at: int = Field(
        description="Time at which the grant was last synced. Measured in seconds since the Unix epoch."
    )
    created_at: int = Field(
        description="Time at which the grant was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the grant was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(from_attributes=True)


class GrantFeatureRequest(BaseModel):
    feature_id: str = Field(
        description="Unique identifier for the feature to grant.",
        alias="featureId",
    )
    note: str | None = Field(
        default=None,
        description="Optional note explaining the reason for this grant.",
    )

    model_config = ConfigDict(populate_by_name=True)


class FeatureCreate(BaseModel):
    name: str = Field(description="Human-readable name for the feature.")
    slug: str | None = Field(default=None, description="Provider-safe feature slug. Defaults to a slugified name.")
    description: str | None = Field(default=None, description="Human-readable description of the feature.")
    default_enabled: bool = Field(default=False, description="Whether this feature is globally enabled by default.")
    scope: str | None = Field(
        default=None,
        description="The feature's scope. One of: consumer, enterprise, global.",
        examples=["consumer", "enterprise", "global"],
    )
    consumer_default_enabled: bool = Field(
        default=False,
        description="Whether this feature is enabled by default for consumer accounts.",
    )
    default_value: bool | None = Field(default=None, description="The default value for this feature flag.")
    value_type: str | None = Field(default=None, description="Remote config value type, if configured.")
    value: Any | None = Field(default=None, description="Remote config value returned with the flag.")
    tags: list[str] = Field(default_factory=list, description="Tags associated with this feature.")
    server_side_only: bool = Field(default=True, description="Whether this flag should only be evaluated server-side.")
    parent_feature_id: str | None = Field(
        default=None,
        description="ID of the parent feature flag. Null creates a solo/root flag.",
    )
    app_id: str | None = Field(
        default=None,
        description="ID of the app this feature belongs to, or null for a platform-wide feature.",
    )


class FeatureDeleted(BaseModel):
    object: Literal["feature"] = "feature"
    id: str = Field(description="Unique identifier of the deleted feature.")
    deleted: Literal[True] = True


class UserFeatureGrant(BaseModel):
    feature_id: str = Field(description="Unique identifier for the feature to grant.")
    enabled: bool = Field(default=True, description="Whether the feature is enabled for this user.")
    note: str | None = Field(default=None, description="Optional note explaining the reason for this grant.")


class UserFeatureUpdate(BaseModel):
    enabled: bool | None = Field(default=None, description="Whether the feature is enabled for this user.")
    note: str | None = Field(default=None, description="Optional note explaining the reason for this grant.")


class UserFeatureDeleted(BaseModel):
    object: Literal["user_feature"] = "user_feature"
    id: str = Field(description="Unique identifier of the deleted user feature grant.")
    deleted: Literal[True] = True


class OrgFeatureGrant(BaseModel):
    feature_id: str = Field(description="Unique identifier for the feature to grant.")
    enabled: bool = Field(default=True, description="Whether the feature is enabled for this organization.")
    note: str | None = Field(default=None, description="Optional note explaining the reason for this grant.")


class OrgFeatureUpdate(BaseModel):
    enabled: bool | None = Field(default=None, description="Whether the feature is enabled for this organization.")
    note: str | None = Field(default=None, description="Optional note explaining the reason for this grant.")


class OrgFeatureDeleted(BaseModel):
    object: Literal["org_feature"] = "org_feature"
    id: str = Field(description="Unique identifier of the deleted organization feature grant.")
    deleted: Literal[True] = True
