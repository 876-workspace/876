from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class EmailResolveRequest(BaseModel):
    identifier: str = Field(
        description="An email address or username to resolve to a canonical email.",
        examples=["user@example.com", "johndoe"],
    )


class EmailResolveResponse(BaseModel):
    email: str = Field(
        description="The resolved canonical email address.",
        examples=["user@example.com"],
    )
    exists: bool = Field(
        default=False,
        description="Whether an account with this email already exists on the platform.",
    )
    business: bool | None = Field(
        default=None,
        description="Whether the resolved account is a business/enterprise account.",
    )
    methods: list[str] = Field(
        default_factory=list,
        description="Authentication methods available for this account (e.g. 'password', 'otp', 'sso').",
    )


class OAuthSessionRequest(BaseModel):
    id_token: str = Field(
        description=(
            "An OIDC ID token issued by this server's /oauth/token endpoint. Used "
            "by first-party apps (e.g. Console) to convert a completed "
            "OAuth login into a first-party session cookie."
        ),
    )


class SwitchSessionRequest(BaseModel):
    sid: str = Field(
        description=(
            "The session id of the signed-in account to make active. Must belong "
            "to the caller's own account set (carried in the session cookie)."
        ),
        examples=["ses_01J9X..."],
    )


class LoginRequest(BaseModel):
    identifier: str = Field(
        description="Email address or username to log in with.",
        examples=["user@example.com"],
    )
    password: str = Field(description="The account password.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"identifier": "user@example.com", "password": "SecurePass123!"},
            ]
        }
    )


class RegisterRequest(BaseModel):
    email: str = Field(
        description="Email address for the new account.",
        examples=["user@example.com"],
    )
    password: str = Field(description="Password for the new account (min 8 chars).")
    first_name: str = Field(
        description="The user's first name.",
        alias="firstName",
    )
    last_name: str = Field(
        description="The user's last name.",
        alias="lastName",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "email": "jane@example.com",
                    "password": "SecurePass123!",
                    "firstName": "Jane",
                    "lastName": "Doe",
                }
            ]
        },
    )


class RegisterBusinessRequest(RegisterRequest):
    organization_name: str = Field(
        description="The name of the organization to create.",
        alias="organizationName",
    )
    organization_slug: str | None = Field(
        default=None,
        description="URL-safe unique identifier. Generated from the organization name when omitted.",
        alias="organizationSlug",
    )

    model_config = ConfigDict(populate_by_name=True)


class SocialLoginRequest(BaseModel):
    provider: str = Field(
        description="The OAuth provider to use for social login.",
        examples=["google", "microsoft", "github"],
    )
    screen_hint: str | None = Field(
        default=None,
        description="Hint to the provider's login screen ('sign-in' or 'sign-up').",
        alias="screenHint",
    )
    login_hint: str | None = Field(
        default=None,
        description="Pre-fill the login form with this email address.",
        alias="loginHint",
    )

    model_config = ConfigDict(populate_by_name=True)


class SocialLoginResponse(BaseModel):
    url: str = Field(
        description="The authorization URL to redirect the user to.",
        examples=["https://accounts.google.com/o/oauth2/auth?..."],
    )


class SocialProviderResponse(BaseModel):
    object: Literal["auth_provider"] = Field(
        default="auth_provider",
        description="String representing the object's type. Always 'auth_provider'.",
    )
    id: str = Field(
        description="The provider identifier passed to social-login.",
        examples=["google"],
    )
    label: str = Field(
        description="Human-readable provider name for display.",
        examples=["Google"],
    )
    icon_slug: str = Field(
        description="Stable slug used to look up the provider's brand icon.",
        examples=["google"],
    )


class MagicOtpSendRequest(BaseModel):
    email: str = Field(
        description="Email address to send the magic OTP to.",
        examples=["user@example.com"],
    )


class MagicOtpSendResponse(BaseModel):
    email: str = Field(
        description="The email address the OTP was sent to.",
        examples=["user@example.com"],
    )
    can_resend_at: int = Field(
        description="Unix timestamp after which the OTP can be resent.",
        alias="canResendAt",
    )

    model_config = ConfigDict(populate_by_name=True)


class MagicOtpVerifyRequest(BaseModel):
    email: str = Field(
        description="Email address that received the magic OTP.",
        examples=["user@example.com"],
    )
    code: str = Field(
        description="The magic OTP code received via email.",
        examples=["123456"],
    )


class RecoverRequest(BaseModel):
    email: str = Field(
        description="Email address to send the password recovery link to.",
        examples=["user@example.com"],
    )


class RecoverResponse(BaseModel):
    email: str = Field(
        description="The email address the recovery link was sent to.",
        examples=["user@example.com"],
    )


class ResetPasswordRequest(BaseModel):
    token: str = Field(description="Password reset token received via email.")
    password: str = Field(description="The new password to set.")


class ResetPasswordResponse(BaseModel):
    email: str = Field(
        description="The email address of the account whose password was reset.",
        examples=["user@example.com"],
    )


class VerifyEmailRequest(BaseModel):
    code: str = Field(
        description="The email verification code.",
        examples=["123456"],
    )
    pending_authentication_token: str = Field(
        description="The pending authentication token received after initial registration.",
        alias="pendingAuthenticationToken",
    )

    model_config = ConfigDict(populate_by_name=True)


class CallbackRequest(BaseModel):
    code: str = Field(description="The authorization code returned by the OAuth provider.")
    code_verifier: str | None = Field(
        default=None,
        description="PKCE code verifier, if PKCE was used.",
        alias="codeVerifier",
    )
    invitation_token: str | None = Field(
        default=None,
        description="Organization invitation token, if accepting an invite.",
        alias="invitationToken",
    )
    ip_address: str | None = Field(
        default=None,
        description="Client IP address for session creation.",
        alias="ipAddress",
    )
    user_agent: str | None = Field(
        default=None,
        description="Client User-Agent for session creation.",
        alias="userAgent",
    )

    model_config = ConfigDict(populate_by_name=True)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(
        description="The refresh token to exchange for a new access token.",
        alias="refreshToken",
    )
    organization_id: str | None = Field(
        default=None,
        description="Organization ID to scope the refreshed session to.",
        alias="organizationId",
    )

    model_config = ConfigDict(populate_by_name=True)


class RoutingOrganization(BaseModel):
    id: str = Field(description="Unique identifier for the organization.")
    name: str | None = Field(default=None, description="The name of the organization.")
    slug: str = Field(description="URL-safe slug for the organization.")
    status: str = Field(description="The organization status.")


class RoutingMembership(BaseModel):
    id: str = Field(description="Unique identifier for the membership.")
    role: str = Field(
        description="The user's role within the organization.",
        examples=["owner", "admin", "member"],
    )
    status: str = Field(
        description="The membership status.",
        examples=["active", "invited", "suspended", "removed"],
    )
    permissions: list[str] = Field(
        default_factory=list,
        description="Effective org permissions for this membership (from its organization role).",
    )
    organization: RoutingOrganization = Field(description="The organization associated with the membership.")

    model_config = ConfigDict(populate_by_name=True)


class RoutingMembershipsResponse(BaseModel):
    data: list[RoutingMembership] = Field(description="List of memberships for routing decisions.")


# ── Auth response models ──────────────────────────────────────────────────────


class AuthSessionUser(BaseModel):
    """User object embedded in session and authentication responses (camelCase contract)."""

    object: Literal["user"] = Field(default="user", description="Always 'user'.")
    id: str = Field(description="Unique identifier for the user.")
    stripeCustomerId: str | None = Field(default=None, description="Stripe customer ID, if any.")
    email: str = Field(description="The user's email address.")
    username: str | None = Field(default=None, description="Optional username login handle.")
    emailVerified: bool = Field(description="Whether the email has been verified.")
    firstName: str = Field(description="The user's first name.")
    lastName: str = Field(description="The user's last name.")
    middleName: str | None = Field(default=None, description="The user's middle name.")
    avatar: str | None = Field(default=None, description="Avatar URL.")
    status: str = Field(description="Account status: 'active', 'inactive', or 'suspended'.")
    createdAt: int = Field(description="Unix timestamp of account creation.")
    updatedAt: int = Field(description="Unix timestamp of last update.")

    model_config = ConfigDict(populate_by_name=True)


class SessionMetaResponse(BaseModel):
    """Session metadata included in auth responses."""

    object: Literal["session"] = Field(default="session", description="Always 'session'.")
    userId: str = Field(
        description="The platform user ID for this session. Provider (WorkOS) "
        "identifiers are never exposed here — only the internal 876 user id."
    )
    expiresAt: int | None = Field(default=None, description="Session expiry Unix timestamp.")


class AuthSessionResponse(BaseModel):
    """Successful authentication response — session envelope with user data."""

    object: Literal["session"] = Field(default="session", description="Always 'session'.")
    user: AuthSessionUser = Field(description="The authenticated user.")
    sessionMeta: SessionMetaResponse | None = Field(default=None, description="Session metadata.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "object": "session",
                    "user": {
                        "object": "user",
                        "id": "usr_01...",
                        "email": "user@example.com",
                        "emailVerified": True,
                        "firstName": "Jane",
                        "lastName": "Doe",
                        "status": "active",
                        "createdAt": 1700000000,
                        "updatedAt": 1700000000,
                    },
                    "sessionMeta": {
                        "object": "session",
                        "userId": "usr_01...",
                        "expiresAt": None,
                    },
                }
            ]
        }
    )


class AuthEventResponse(BaseModel):
    """Returned when an additional step is required before a session can be issued."""

    object: Literal["auth_event"] = Field(default="auth_event", description="Always 'auth_event'.")
    type: str = Field(
        description="The event type, e.g. 'email_verification_required'.",
        examples=["email_verification_required"],
    )
    email: str | None = Field(default=None, description="The email address that triggered this event.")
    pendingAuthenticationToken: str | None = Field(
        default=None,
        description="Opaque token passed to /verify-email to complete the flow.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "object": "auth_event",
                    "type": "email_verification_required",
                    "email": "user@example.com",
                    "pendingAuthenticationToken": "pat_...",
                }
            ]
        }
    )


class VerifiedUserResponse(BaseModel):
    """Successful verification response containing the authenticated user."""

    user: AuthSessionUser = Field(description="The authenticated user.")


class AuthRefreshUserResponse(BaseModel):
    """Provider user object embedded in refresh-token responses."""

    id: str = Field(description="Provider user identifier.")
    email: str = Field(description="The user's email address.")
    firstName: str | None = Field(default=None, description="The user's first name.")
    lastName: str | None = Field(default=None, description="The user's last name.")
    emailVerified: bool = Field(description="Whether the email has been verified.")
    avatar: str | None = Field(default=None, description="Avatar URL.")


class AuthRefreshResponse(BaseModel):
    """Successful refresh-token response."""

    accessToken: str = Field(description="Refreshed access token.")
    refreshToken: str | None = Field(default=None, description="Rotated refresh token, when returned by the provider.")
    user: AuthRefreshUserResponse = Field(description="Provider user data for the refreshed session.")


class SessionSwitchResponse(BaseModel):
    """Session-switch response for multi-account cookies."""

    object: Literal["session"] = Field(default="session", description="Always 'session'.")
    active_sid: str = Field(description="Session id now active in the account set.")
    user: dict[str, Any] = Field(description="Cookie snapshot for the active account.")


class SessionSignoutResponse(BaseModel):
    """Response returned after signing out one account from the cookie set."""

    object: Literal["session"] = Field(default="session", description="Always 'session'.")
    signed_out: str = Field(description="Session id that was signed out.")
    remaining: int = Field(description="Number of accounts left in the cookie set.")


class SessionDataResponse(BaseModel):
    """Shape returned by GET /auth/session — the decoded session cookie payload."""

    data: dict[str, Any] = Field(description="Decoded session data from the sealed cookie.")
    error: None = Field(default=None, description="Always null on success.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "data": {
                        "user": {"id": "usr_01...", "email": "user@example.com"},
                    },
                    "error": None,
                }
            ]
        }
    )




class EmptyResponse(BaseModel):
    """Empty success body returned by operations like logout."""

    model_config = ConfigDict(json_schema_extra={"examples": [{}]})
