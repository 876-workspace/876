from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AppResponse(BaseModel):
    object: Literal["app"] = Field(
        default="app",
        description="String representing the object's type. Always 'app'.",
    )
    id: str = Field(description="Unique identifier for the app.")
    name: str = Field(description="Human-readable name for the app.", examples=["My OAuth App"])
    slug: str = Field(
        description="URL-safe unique identifier for the app.",
        examples=["my-oauth-app"],
    )
    feature_prefix: str = Field(
        description="Snake-case namespace required for feature flags owned by this app.",
        examples=["billing"],
    )
    organization_id: str | None = Field(
        default=None,
        description="Unique identifier for the organization that owns this app.",
    )
    client_id: str = Field(description="OAuth client ID used to identify this app in authorization requests.")
    client_type: str = Field(
        description="Whether this is a 'public' or 'confidential' client.",
        examples=["public", "confidential"],
    )
    app_kind: str = Field(
        description=(
            "App category: 'internal' (internal tooling only), 'platform' "
            "(first-party account/workspace surface without plans), 'product' "
            "(SaaS product line with plans/subscriptions), or 'external' "
            "(third-party app)."
        ),
        examples=["internal", "platform", "product", "external"],
    )
    status: Literal["active", "inactive"] = Field(
        description="Operational status for this app.",
        examples=["active", "inactive"],
    )
    allowed_redirect_uris: list[str] = Field(description="List of allowed redirect URIs for OAuth flows.")
    allowed_logout_uris: list[str] = Field(description="List of allowed post-logout redirect URIs.")
    logo_url: str | None = Field(default=None, description="URL of the app's logo image.")
    homepage_url: str | None = Field(default=None, description="URL of the app's homepage.")
    type: str = Field(description="Internal app type classification.", examples=["web"])
    scopes_allowed: list[str] = Field(
        description="OAuth scopes that this app is permitted to request.",
        examples=[["openid", "profile", "email"]],
    )
    created_at: int = Field(
        description="Time at which the app was registered. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the app record was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(from_attributes=True)


class AppCreatedResponse(AppResponse):
    client_secret: str | None = Field(
        default=None,
        description="The unhashed OAuth client secret. Only returned on initial creation of confidential clients.",
        alias="clientSecret",
    )


class AppCreate(BaseModel):
    organization_id: str | None = Field(
        default=None,
        description="Unique identifier for the organization that owns this app.",
        alias="organizationId",
    )
    name: str = Field(description="Human-readable name for the app.")
    client_type: str = Field(
        description="Whether this is a 'public' or 'confidential' client.",
        alias="clientType",
    )
    app_kind: Literal["internal", "platform", "product", "external"] = Field(
        default="external",
        description="App category: 'internal', 'platform', 'product', or 'external'.",
        alias="appKind",
    )
    status: Literal["active", "inactive"] = Field(
        default="active",
        description="Operational status for this app.",
    )
    redirect_uris: list[str] | None = Field(
        default=None,
        description="List of allowed redirect URIs for OAuth flows.",
        alias="redirectUris",
    )
    homepage_url: str | None = Field(
        default=None,
        description="URL of the app's homepage.",
        alias="homepageUrl",
    )
    logo_url: str | None = Field(
        default=None,
        description="URL of the app's logo image.",
        alias="logoUrl",
    )
    scopes_allowed: list[str] | None = Field(
        default=None,
        description="OAuth scopes that this app is permitted to request.",
        alias="scopesAllowed",
    )

    model_config = ConfigDict(populate_by_name=True)


class AppUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    homepage_url: str | None = None
    app_kind: Literal["internal", "platform", "product", "external"] | None = None
    status: Literal["active", "inactive"] | None = None
    organization_id: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class AppDeleteResponse(BaseModel):
    object: Literal["app"] = "app"
    id: str
    deleted: bool = True


class ApiKeyResponse(BaseModel):
    object: Literal["api_key"] = "api_key"
    id: str
    app_id: str
    name: str | None = None
    revoked: bool
    expires_at: int | None = None
    last_used_at: int | None = None
    created_at: int

    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str = Field(description="The plaintext API key. Only returned at creation — store it securely.")


class ApiKeyDeleteResponse(BaseModel):
    object: Literal["api_key"] = "api_key"
    id: str
    deleted: bool = True


class ApiKeyCreate(BaseModel):
    name: str | None = None
    expires_at: int | None = Field(default=None, alias="expiresAt")

    model_config = ConfigDict(populate_by_name=True)


class ApiKeyUpdate(BaseModel):
    name: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class AppPublicResponse(BaseModel):
    """Public-safe app metadata returned for login page branding."""

    object: Literal["app"] = "app"
    name: str
    logo_url: str | None = None
    app_kind: Literal["internal", "platform", "product", "external"]
