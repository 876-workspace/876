from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Gender = Literal["male", "female", "other"]


class UserBase(BaseModel):
    workos_user_id: str = Field(
        description="Unique identifier for the matching WorkOS user.",
        examples=["user_01HFNPGM9K..."],
    )
    stripe_customer_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching Stripe customer, if one exists.",
    )
    email: str = Field(
        description="The user's email address.",
        examples=["user@example.com"],
    )
    username: str | None = Field(
        default=None,
        description="Optional username that can be used as a login handle.",
    )
    email_verified: bool = Field(description="Whether the user's email has been verified by the auth provider.")
    first_name: str = Field(description="The user's first name.")
    last_name: str = Field(description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name.")
    avatar: str | None = Field(
        default=None,
        description="URL of the user's avatar image, if available.",
    )
    platform_role: str | None = Field(
        default=None,
        description=(
            "The user's platform role. Governs platform/Console access only — "
            "an organization role is separate and lives on the user's membership. "
            "Null means no Console access."
        ),
        examples=["owner", None],
    )
    status: str = Field(
        description="The user's account status.",
        examples=["active", "inactive", "suspended"],
    )
    banned: bool = Field(description="Whether the user is banned from accessing the platform.")
    banned_reason: str | None = Field(
        default=None,
        description="Optional internal reason recorded when the user was banned. Null when not banned.",
    )


class UserResponse(UserBase):
    object: Literal["user"] = Field(
        default="user",
        description="String representing the object's type. Always 'user'.",
    )
    id: str = Field(
        description="Unique identifier for the user.",
        examples=["usr_01HFNPGM9K..."],
    )
    company: str | None = Field(
        default=None,
        description="Name of the user's primary organization, if they belong to one.",
    )
    company_short_name: str | None = Field(
        default=None,
        description="Short name of the user's primary organization, if available.",
    )
    company_logo: str | None = Field(
        default=None,
        description="Logo URL of the user's primary organization, if available.",
    )
    deleted_at: int | None = Field(
        default=None,
        description="Unix timestamp when the user was soft-deleted. Null means the user is active.",
    )
    deleted_by: str | None = Field(
        default=None,
        description="ID of the admin who deleted this user, if recorded.",
    )
    deletion_reason: str | None = Field(
        default=None,
        description="Optional reason recorded at deletion time.",
    )
    created_at: int = Field(description="Time at which the user was created. Measured in seconds since the Unix epoch.")
    updated_at: int = Field(
        description="Time at which the user was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "user",
                    "id": "usr_01HFNPGM9K",
                    "company": None,
                    "company_short_name": None,
                    "workos_user_id": "user_01HFNPGM9K",
                    "stripe_customer_id": None,
                    "email": "user@example.com",
                    "username": None,
                    "email_verified": True,
                    "first_name": "Jane",
                    "last_name": "Doe",
                    "middle_name": None,
                    "avatar": None,
                    "status": "active",
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )


class EnsuredUserResponse(BaseModel):
    """User returned by the app-API-key `POST /users/ensure` endpoint.

    Deliberately omits WorkOS identifiers and other admin-only fields.
    Provider details are an internal platform concern and surface only
    through the privileged Console (admin) tier — never to
    consumer/app-key callers.
    """

    object: Literal["user"] = Field(
        default="user",
        description="String representing the object's type. Always 'user'.",
    )
    id: str = Field(description="Unique identifier for the user.", examples=["usr_01HFNPGM9K..."])
    stripe_customer_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching Stripe customer, if one exists.",
    )
    email: str = Field(description="The user's email address.", examples=["user@example.com"])
    username: str | None = Field(default=None, description="Optional username login handle.")
    email_verified: bool = Field(description="Whether the user's email has been verified.")
    first_name: str = Field(description="The user's first name.")
    last_name: str = Field(description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name.")
    avatar: str | None = Field(default=None, description="URL of the user's avatar image, if available.")
    status: str = Field(description="The user's account status.", examples=["active", "inactive", "suspended"])
    created_at: int = Field(description="Time at which the user was created. Seconds since the Unix epoch.")
    updated_at: int = Field(description="Time at which the user was last updated. Seconds since the Unix epoch.")

    model_config = ConfigDict(from_attributes=True)


class UserDeleteResponse(BaseModel):
    object: Literal["user"] = "user"
    id: str
    deleted: bool = True


class UserAppResponse(BaseModel):
    object: Literal["app"] = "app"
    id: str = Field(description="Unique identifier for the app.")
    name: str = Field(description="Display name of the app.")
    slug: str = Field(description="URL-safe slug for the app.")
    logo_url: str | None = Field(default=None, description="Logo URL for the app.")
    homepage_url: str | None = Field(default=None, description="Homepage URL for the app.")
    app_kind: str = Field(
        description="App category: 'internal', 'platform', 'product', or 'external'.",
        examples=["internal", "platform", "product", "external"],
    )
    status: str = Field(description="App status.", examples=["active", "inactive"])
    enrolled_at: int = Field(description="Unix timestamp when the user first authenticated through this app.")
    last_seen_at: int = Field(description="Unix timestamp of the user's most recent session through this app.")


class UserBackfillUsernamesResponse(BaseModel):
    updated: int = Field(description="Number of users updated.")
    ids: list[str] = Field(description="User IDs that received usernames.")


class UserOAuthGrantRevokeResponse(BaseModel):
    revoked: bool = Field(description="Whether the OAuth grant was revoked.")


class AccountResponse(BaseModel):
    object: Literal["account"] = Field(
        default="account",
        description="String representing the object's type. Always 'account'.",
    )
    id: str = Field(description="Unique identifier for the linked auth account.")
    provider_id: str = Field(
        description="Identifier for the sign-in provider.",
        examples=["google", "apple", "microsoft"],
    )
    provider_type: str = Field(
        description="Type of sign-in provider used by the account.",
        examples=["oauth", "credential"],
    )
    created_at: int = Field(
        description="Time at which the linked auth account was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the linked auth account was last updated. Measured in seconds since the Unix epoch."
    )


class ConsumerProfileResponse(BaseModel):
    object: Literal["consumer_profile"] = "consumer_profile"
    id: str = Field(description="Unique identifier for the profile.")
    user_id: str = Field(description="Unique identifier for the matching user.")
    email: str = Field(description="The user's email address.")
    username: str | None = Field(default=None, description="The user's username.")
    first_name: str = Field(description="The user's first name.")
    last_name: str = Field(description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name.")
    nickname: str | None = Field(default=None, description="The user's preferred nickname.")
    avatar: str | None = Field(default=None, description="URL of the user's avatar image.")
    gender: Gender | None = Field(default=None, description="The user's gender.")
    phone_number: str | None = Field(default=None, description="The user's phone number.")
    date_of_birth: str | None = Field(default=None, description="The user's date of birth.")
    language: str | None = Field(default=None, description="The user's preferred language.")
    timezone: str | None = Field(default=None, description="The user's preferred timezone.")
    created_at: int = Field(description="Time at which the profile was created.")
    updated_at: int = Field(description="Time at which the profile was last updated.")


class ConsumerProfileUpdate(BaseModel):
    first_name: str | None = Field(default=None, description="The user's first name.")
    last_name: str | None = Field(default=None, description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name. Set to null to clear it.")
    nickname: str | None = Field(default=None, description="The user's preferred nickname. Set to null to clear it.")
    avatar: str | None = Field(default=None, description="URL of the user's avatar image. Set to null to clear it.")
    gender: Gender | None = Field(default=None, description="The user's gender. Set to null to clear it.")
    phone_number: str | None = Field(default=None, description="The user's phone number. Set to null to clear it.")
    date_of_birth: str | None = Field(default=None, description="The user's date of birth. Set to null to clear it.")
    language: str | None = Field(default=None, description="The user's preferred language. Set to null to clear it.")
    timezone: str | None = Field(default=None, description="The user's preferred timezone. Set to null to clear it.")


class ConsumerProfileDeleteResponse(BaseModel):
    object: Literal["consumer_profile"] = "consumer_profile"
    id: str
    deleted: bool = True


class ConsumerAddressCreate(BaseModel):
    type: Literal["billing", "shipping", "home", "work", "other"] = Field(default="other", description="Address type.")
    label: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    region_id: str | None = Field(default=None, alias="regionId")
    country_code: str | None = Field(default=None, alias="countryCode")
    postal_code: str | None = Field(default=None, alias="postalCode")
    is_default: bool = Field(default=False, alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class ConsumerAddressUpdate(BaseModel):
    type: Literal["billing", "shipping", "home", "work", "other"] | None = None
    label: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    region_id: str | None = Field(default=None, alias="regionId")
    country_code: str | None = Field(default=None, alias="countryCode")
    postal_code: str | None = Field(default=None, alias="postalCode")
    is_default: bool | None = Field(default=None, alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class ConsumerContactUserResponse(BaseModel):
    object: Literal["user"] = "user"
    id: str = Field(description="Unique identifier for the contact user.")
    email: str = Field(description="The contact user's email address.")
    username: str | None = Field(default=None, description="The contact user's username.")
    first_name: str = Field(description="The contact user's first name.")
    last_name: str = Field(description="The contact user's last name.")
    middle_name: str | None = Field(default=None, description="The contact user's middle name.")
    avatar: str | None = Field(default=None, description="URL of the contact user's avatar image.")


class ConsumerContactResponse(BaseModel):
    object: Literal["user_contact"] = "user_contact"
    id: str = Field(description="Unique identifier for the saved contact.")
    owner_user_id: str = Field(description="User ID that owns this saved contact.")
    contact_user_id: str = Field(description="User ID saved as a contact.")
    contact_user: ConsumerContactUserResponse = Field(description="Public profile summary for the saved user.")
    nickname: str | None = Field(default=None, description="Optional contact nickname.")
    notes: str | None = Field(default=None, description="Optional private notes about this contact.")
    created_at: int = Field(description="Time at which the contact was created.")
    updated_at: int = Field(description="Time at which the contact was last updated.")


class ConsumerContactCreate(BaseModel):
    contact_user_id: str = Field(description="User ID to save as a contact.", alias="contactUserId")
    nickname: str | None = Field(default=None, description="Optional contact nickname.")
    notes: str | None = Field(default=None, description="Optional private notes about this contact.")

    model_config = ConfigDict(populate_by_name=True)


class ConsumerContactUpdate(BaseModel):
    nickname: str | None = Field(default=None, description="Optional contact nickname. Set to null to clear it.")
    notes: str | None = Field(default=None, description="Optional private notes. Set to null to clear it.")


class ConsumerContactDeleteResponse(BaseModel):
    object: Literal["user_contact"] = "user_contact"
    id: str
    deleted: bool = True


class UserCreate(BaseModel):
    email: str = Field(description="The user's email address.")
    first_name: str = Field(description="The user's first name.")
    last_name: str = Field(description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name.")
    username: str | None = Field(
        default=None,
        description="Optional username that can be used as a login handle.",
    )
    email_verified: bool | None = Field(
        default=None,
        description="Whether the user's email has been verified by the auth provider.",
    )
    avatar: str | None = Field(
        default=None,
        description="URL of the user's avatar image, if available.",
    )
    status: str | None = Field(default=None, description="The user's account status.")


class UserUpdate(BaseModel):
    stripe_customer_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching Stripe customer. Set to null to clear it.",
    )
    email: str | None = Field(default=None, description="The user's email address.")
    username: str | None = Field(
        default=None,
        description="Optional username. Set to null to clear it.",
    )
    email_verified: bool | None = Field(
        default=None,
        description="Whether the user's email has been verified by the auth provider.",
    )
    first_name: str | None = Field(default=None, description="The user's first name.")
    last_name: str | None = Field(default=None, description="The user's last name.")
    middle_name: str | None = Field(default=None, description="The user's middle name. Set to null to clear it.")
    avatar: str | None = Field(
        default=None,
        description="URL of the user's avatar image. Set to null to clear it.",
    )
    status: str | None = Field(default=None, description="The user's account status.")


class UsernameAvailabilityResponse(BaseModel):
    object: Literal["username_availability"] = Field(
        default="username_availability",
        description="String representing the object's type. Always 'username_availability'.",
    )
    username: str = Field(description="The normalized (lowercased) username that was checked.")
    available: bool = Field(description="Whether the username can be claimed.")
    code: Literal["available", "invalid", "reserved", "taken"] = Field(
        description="Machine-readable outcome: available, invalid (bad format), reserved, or taken.",
    )
    reason: str = Field(description="Human-readable explanation of the outcome.")


class UserBanRequest(BaseModel):
    reason: str | None = Field(
        default=None,
        description="Optional internal reason for the ban. Stored for admin reference; never shown to the banned user.",
        examples=["Repeated Terms of Service violations."],
    )


class UserEnsureRequest(BaseModel):
    workos_user_id: str = Field(
        description="Unique WorkOS user identifier.",
        alias="workosUserId",
    )
    email: str = Field(description="The user's email address.")
    first_name: str | None = Field(
        default=None,
        description="The user's first name.",
        alias="firstName",
    )
    last_name: str | None = Field(
        default=None,
        description="The user's last name.",
        alias="lastName",
    )
    username: str | None = Field(
        default=None,
        description="Optional username.",
        alias="username",
    )
    avatar: str | None = Field(
        default=None,
        description="URL of the user's avatar image.",
        alias="avatar",
    )
    email_verified: bool | None = Field(
        default=None,
        description="Whether email is verified.",
        alias="emailVerified",
    )

    model_config = ConfigDict(populate_by_name=True)


class AuthorizedAppResponse(BaseModel):
    object: Literal["authorized_app"] = "authorized_app"
    id: str
    appId: str = Field(alias="appId")
    name: str
    clientId: str = Field(alias="clientId")
    logoUrl: str | None = Field(default=None, alias="logoUrl")
    homepageUrl: str | None = Field(default=None, alias="homepageUrl")
    scopes: list[str]
    createdAt: int = Field(alias="createdAt")
    updatedAt: int = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Reserved usernames
# ---------------------------------------------------------------------------


class ReservedUsernameResponse(BaseModel):
    object: Literal["reserved_username"] = Field(
        default="reserved_username",
        description="String representing the object's type. Always 'reserved_username'.",
    )
    username: str = Field(description="The reserved username (stored lowercase).")
    reason: str | None = Field(default=None, description="Optional reason this username is reserved.")
    created_at: int = Field(description="Unix timestamp when this entry was added.")

    model_config = ConfigDict(from_attributes=True)


class ReservedUsernameCreate(BaseModel):
    username: str = Field(
        description="The username to reserve. Must pass the standard format rules.",
        min_length=1,
        max_length=64,
    )
    reason: str | None = Field(
        default=None,
        description="Optional reason for reserving this username (admin-only, never shown to users).",
    )


class ReservedUsernameDeleteResponse(BaseModel):
    object: Literal["reserved_username"] = "reserved_username"
    username: str
    deleted: bool = True


# ---------------------------------------------------------------------------
# Account (linked sign-in provider) admin operations
# ---------------------------------------------------------------------------


class UserAccountUnlinkResponse(BaseModel):
    object: Literal["account"] = "account"
    id: str = Field(description="Unique identifier of the unlinked account.")
    deleted: bool = True


# ---------------------------------------------------------------------------
# Session revocation
# ---------------------------------------------------------------------------


class UserSessionRevokeResponse(BaseModel):
    object: Literal["session_revoke"] = Field(
        default="session_revoke",
        description="String representing the object's type. Always 'session_revoke'.",
    )
    user_id: str = Field(description="ID of the user whose sessions were revoked.")
    sessions_revoked: int = Field(description="Number of active sessions that were deleted.")


# ---------------------------------------------------------------------------
# Identifications (sensitive verified identifiers, entitlement-gated)
# ---------------------------------------------------------------------------


class UserIdentificationResponse(BaseModel):
    object: Literal["user_identification"] = Field(
        default="user_identification",
        description="String representing the object's type. Always 'user_identification'.",
    )
    id: str = Field(description="Unique identifier for the identification record.")
    user_id: str = Field(description="ID of the user this identification belongs to.")
    type: str = Field(
        description="Identification type key.",
        examples=["trn", "passport", "drivers_license"],
    )
    label: str = Field(description="Human-readable label for the identification type.")
    country_code: str | None = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code the identification is issued under, if applicable.",
    )
    value_masked: str = Field(
        description="The identification value with all but the last 3 characters masked with '•'."
    )
    verified: bool = Field(description="Whether this identification has been verified.")
    verified_at: int | None = Field(
        default=None,
        description="Unix timestamp when this identification was verified. Null when unverified.",
    )
    created_at: int = Field(description="Time at which the identification was created.")
    updated_at: int = Field(description="Time at which the identification was last updated.")

    model_config = ConfigDict(from_attributes=True)


class UserIdentificationCreate(BaseModel):
    type: str = Field(
        description="Identification type key. Must be a known type from the core registry.",
        examples=["trn", "passport", "drivers_license"],
    )
    value: str = Field(description="Raw identification value. Normalized and validated server-side.")
    country_code: str | None = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code override. Defaults to the type's registered country.",
    )


class UserIdentificationUpdate(BaseModel):
    value: str = Field(
        description="Replacement raw identification value. Normalized and validated server-side. "
        "Resets verification state."
    )
    country_code: str | None = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code override. Omit to keep the current value.",
    )


class UserIdentificationDeleteResponse(BaseModel):
    object: Literal["user_identification"] = "user_identification"
    id: str
    deleted: bool = True


class UserIdentificationDiscloseRequest(BaseModel):
    organization_id: str = Field(description="ID of the requesting organization.")
    app_slug: str = Field(description="Slug of the requesting app.", examples=["876-couriers"])
    reason: str | None = Field(
        default=None,
        description="Optional reason recorded on the audit event for this disclosure.",
    )


class UserIdentificationDisclosureResponse(BaseModel):
    object: Literal["user_identification_disclosure"] = Field(
        default="user_identification_disclosure",
        description="String representing the object's type. Always 'user_identification_disclosure'.",
    )
    type: str = Field(description="Identification type key.")
    value: str = Field(
        description="The full, unmasked identification value. Only ever returned by this endpoint."
    )
    country_code: str | None = Field(
        default=None, description="ISO 3166-1 alpha-2 country code, if applicable."
    )
    verified: bool = Field(description="Whether this identification has been verified.")
    disclosed_at: int = Field(description="Unix timestamp when this disclosure was made and audit-logged.")


class UserIdentificationVerifyRequest(BaseModel):
    verified_by: str = Field(description="Opaque actor id recorded as the verifier.")
