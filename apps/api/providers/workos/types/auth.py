from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from providers.workos.types._coerce import coerce_to_unix


class WorkosUser(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    object: Literal["user"] = "user"
    id: str
    email: str
    first_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("first_name", "firstName"),
    )
    last_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("last_name", "lastName"),
    )
    email_verified: bool = Field(
        default=False,
        validation_alias=AliasChoices("email_verified", "emailVerified"),
    )
    profile_picture_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("profile_picture_url", "profilePictureUrl"),
    )
    external_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("external_id", "externalId"),
    )
    metadata: dict[str, str] | None = None
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


class WorkosAuthSuccess(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    user: WorkosUser
    access_token: str = Field(
        validation_alias=AliasChoices("access_token", "accessToken"),
    )
    refresh_token: str = Field(
        validation_alias=AliasChoices("refresh_token", "refreshToken"),
    )
    organization_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("organization_id", "organizationId"),
    )
    authentication_method: str | None = Field(
        default=None,
        validation_alias=AliasChoices("authentication_method", "authenticationMethod"),
    )
    impersonator: dict[str, Any] | None = None
    oauth_tokens: dict[str, Any] | None = Field(
        default=None,
        validation_alias=AliasChoices("oauth_tokens", "oauthTokens"),
    )


# ── Auth-flow event models ─────────────────────────────────────────────────────
# Returned by WorkOS as HTTP 4xx whose "code" indicates a required next step.
# Discriminated on `kind`.


class WorkosEmailVerificationRequired(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["email_verification_required"] = "email_verification_required"
    pending_authentication_token: str | None = None
    email: str | None = None
    email_verification_id: str | None = None


class WorkosMfaEnrollment(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["mfa_enrollment"] = "mfa_enrollment"
    pending_authentication_token: str | None = None
    user: dict[str, Any] | None = None


class WorkosMfaChallenge(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["mfa_challenge"] = "mfa_challenge"
    pending_authentication_token: str | None = None
    authentication_factors: list[dict[str, Any]] = Field(default_factory=list)
    user: dict[str, Any] | None = None


class WorkosOrganizationSelectionRequired(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["organization_selection_required"] = "organization_selection_required"
    pending_authentication_token: str | None = None
    organizations: list[dict[str, Any]] = Field(default_factory=list)
    user: dict[str, Any] | None = None


class WorkosSsoRequired(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["sso_required"] = "sso_required"
    pending_authentication_token: str | None = None
    email: str | None = None
    connection_ids: list[str] = Field(default_factory=list)
    error_description: str | None = None


class WorkosOrganizationAuthMethodsRequired(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["organization_authentication_methods_required"] = "organization_authentication_methods_required"
    pending_authentication_token: str | None = None
    email: str | None = None
    sso_connection_ids: list[str] = Field(default_factory=list)
    auth_methods: dict[str, Any] | None = None
    error_description: str | None = None


class WorkosAuthMethodNotAllowed(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["authentication_method_not_allowed"] = "authentication_method_not_allowed"
    pending_authentication_token: str | None = None


class WorkosEmailPasswordAuthDisabled(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["email_password_auth_disabled"] = "email_password_auth_disabled"
    pending_authentication_token: str | None = None


class WorkosPasskeyProgressiveEnrollment(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["passkey_progressive_enrollment"] = "passkey_progressive_enrollment"
    pending_authentication_token: str | None = None


class WorkosRadarChallenge(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["radar_challenge"] = "radar_challenge"
    pending_authentication_token: str | None = None


class WorkosRadarSignUpChallenge(BaseModel):
    model_config = ConfigDict(extra="allow")

    kind: Literal["radar_sign_up_challenge"] = "radar_sign_up_challenge"
    pending_authentication_token: str | None = None


class WorkosUnknownAuthEvent(BaseModel):
    """Fallback for any unrecognized auth-flow code from WorkOS."""

    model_config = ConfigDict(extra="allow")

    kind: str
    pending_authentication_token: str | None = None
    email: str | None = None


WorkosAuthEvent = Annotated[
    WorkosEmailVerificationRequired
    | WorkosMfaEnrollment
    | WorkosMfaChallenge
    | WorkosOrganizationSelectionRequired
    | WorkosSsoRequired
    | WorkosOrganizationAuthMethodsRequired
    | WorkosAuthMethodNotAllowed
    | WorkosEmailPasswordAuthDisabled
    | WorkosPasskeyProgressiveEnrollment
    | WorkosRadarChallenge
    | WorkosRadarSignUpChallenge
    | WorkosUnknownAuthEvent,
    Field(discriminator="kind"),
]


# ── Magic auth + password reset helpers ───────────────────────────────────────


class WorkosMagicAuth(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str
    code: str | None = None
    email: str | None = None
    expires_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("expires_at", "expiresAt"),
    )

    @field_validator("expires_at", mode="before")
    @classmethod
    def _parse_ts(cls, v: Any) -> int | None:
        return coerce_to_unix(v)


class WorkosPasswordReset(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    user: WorkosUser | None = None
