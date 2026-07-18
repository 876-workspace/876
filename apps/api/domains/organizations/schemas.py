from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OrganizationResponse(BaseModel):
    object: Literal["organization"] = Field(
        default="organization",
        description="String representing the object's type. Always 'organization'.",
    )
    id: str = Field(description="Unique identifier for the organization.")
    workos_organization_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching WorkOS organization.",
    )
    name: str | None = Field(
        default=None,
        description="The organization's display name.",
        examples=["Acme Corp"],
    )
    short_name: str | None = Field(
        default=None,
        description="The organization's short name.",
        examples=["Acme"],
    )
    doing_business_as: str | None = Field(
        default=None, description="Trading name (DBA) if different from the registered name."
    )
    # Business identity
    industry: str | None = Field(default=None, description="Industry the organization operates in.")
    business_type: str | None = Field(
        default=None,
        description="Legal/business structure.",
        examples=["sole_proprietorship", "partnership", "limited_company", "other"],
    )
    registration_number: str | None = Field(
        default=None, description="Company/business registration number (e.g. Companies Office of Jamaica)."
    )
    trn: str | None = Field(default=None, description="Taxpayer Registration Number (Jamaica).")
    nis_number: str | None = Field(default=None, description="National Insurance Scheme number (Jamaica).")
    gct_number: str | None = Field(default=None, description="GCT registration number (Jamaica).")
    tax_id: str | None = Field(default=None, description="Generic tax identifier for non-Jamaican orgs.")
    incorporation_date: str | None = Field(
        default=None, description="Date of incorporation/registration (ISO 8601 date)."
    )
    slug: str = Field(
        description="URL-safe unique identifier for the organization.",
        examples=["acme-corp"],
    )
    status: str = Field(
        description="The organization's status.",
        examples=["active", "suspended", "archived"],
    )
    logo_url: str | None = Field(
        default=None,
        description="URL of the organization's logo image.",
    )
    # Contact
    primary_phone: str | None = Field(default=None, description="Primary phone number.")
    primary_email: str | None = Field(default=None, description="Primary contact email address.")
    website_url: str | None = Field(default=None, description="Organization website URL.")
    support_url: str | None = Field(default=None, description="Customer support URL.")
    # Address
    address_line1: str | None = Field(default=None, description="Street address line 1.")
    address_line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    # Financial
    currency_code: str | None = Field(default=None, description="ISO 4217 currency code.", examples=["JMD"])
    fax: str | None = Field(default=None, description="Fax number.")
    primary_contact_user_id: str | None = Field(
        default=None, description="User ID of the organization's primary contact (defaults to the owner)."
    )
    timezone: str | None = Field(default=None, description="IANA timezone name.", examples=["America/Jamaica"])
    language: str | None = Field(default=None, description="Default language (BCP 47).", examples=["en-JM"])
    # Enrollment
    enrollment_completed_at: int | None = Field(
        default=None,
        description="Unix timestamp when the organization completed enrollment. Null means enrollment is incomplete.",
    )
    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Arbitrary key-value metadata attached to the organization.",
    )
    deleted_at: int | None = Field(
        default=None,
        description="Unix timestamp when the organization was soft-deleted. Null means the organization is active.",
    )
    deleted_by: str | None = Field(
        default=None,
        description="ID of the admin who deleted this organization, if recorded.",
    )
    deletion_reason: str | None = Field(
        default=None,
        description="Optional reason recorded at deletion time.",
    )
    created_at: int = Field(
        description="Time at which the organization was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the organization was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "organization",
                    "id": "org_01HFNPGM9K",
                    "workos_organization_id": None,
                    "name": "Acme Corp",
                    "short_name": "Acme",
                    "slug": "acme-corp",
                    "status": "active",
                    "logo_url": None,
                    "primary_phone": "+1-876-555-0100",
                    "primary_email": "hello@acme.com",
                    "website_url": "https://acme.com",
                    "support_url": None,
                    "address_line1": "1 Knutsford Blvd",
                    "address_line2": None,
                    "city": "Kingston",
                    "region_id": "region_jm_01",
                    "country_code": "JM",
                    "currency_code": "JMD",
                    "enrollment_completed_at": 1700000100,
                    "metadata": None,
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )


class OrganizationBootstrapRequest(BaseModel):
    owner_user_id: str = Field(
        description="876 local user ID of the organization owner.",
        alias="ownerUserId",
    )
    name: str = Field(description="The organization's display name.")
    slug: str | None = Field(
        default=None,
        description="URL-safe unique identifier. Generated from the organization name when omitted.",
    )

    model_config = ConfigDict(populate_by_name=True)


class OrganizationCreate(BaseModel):
    """Admin org creation — only slug is strictly required; all other fields are optional."""

    workos_organization_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching WorkOS organization.",
    )
    name: str | None = Field(
        default=None,
        description="The organization's display name. Recommended but not required on the admin tier.",
    )
    short_name: str | None = Field(
        default=None,
        description="The organization's short display name.",
    )
    doing_business_as: str | None = Field(
        default=None, description="Trading name (DBA) if different from the registered name."
    )
    # Business identity
    industry: str | None = Field(default=None, description="Industry the organization operates in.")
    business_type: str | None = Field(
        default=None,
        description="Legal/business structure.",
        examples=["sole_proprietorship", "partnership", "limited_company", "other"],
    )
    registration_number: str | None = Field(
        default=None, description="Company/business registration number (e.g. Companies Office of Jamaica)."
    )
    trn: str | None = Field(default=None, description="Taxpayer Registration Number (Jamaica).")
    nis_number: str | None = Field(default=None, description="National Insurance Scheme number (Jamaica).")
    gct_number: str | None = Field(default=None, description="GCT registration number (Jamaica).")
    tax_id: str | None = Field(default=None, description="Generic tax identifier for non-Jamaican orgs.")
    incorporation_date: str | None = Field(
        default=None, description="Date of incorporation/registration (ISO 8601 date)."
    )
    fax: str | None = Field(default=None, description="Fax number.")
    primary_contact_user_id: str | None = Field(
        default=None, description="User ID of the organization's primary contact (defaults to the owner)."
    )
    timezone: str | None = Field(default=None, description="IANA timezone name.", examples=["America/Jamaica"])
    language: str | None = Field(default=None, description="Default language (BCP 47).", examples=["en-JM"])
    slug: str | None = Field(
        default=None,
        description="URL-safe unique identifier. Auto-generated from a new ID when omitted.",
    )
    status: str | None = Field(default=None, description="Initial status. Defaults to 'active'.")
    # Contact
    primary_phone: str | None = Field(default=None, description="Primary phone number.")
    primary_email: str | None = Field(default=None, description="Primary contact email address.")
    website_url: str | None = Field(default=None, description="Organization website URL.")
    support_url: str | None = Field(default=None, description="Customer support URL.")
    # Address
    address_line1: str | None = Field(default=None, description="Street address line 1.")
    address_line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    currency_code: str | None = Field(
        default=None,
        description="ISO 4217 currency code. Defaults to 'JMD'.",
        examples=["JMD"],
    )
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrganizationUpdate(BaseModel):
    workos_organization_id: str | None = Field(
        default=None,
        description="Unique identifier for the matching WorkOS organization. Set to null to clear it.",
    )
    name: str | None = Field(default=None, description="The organization's display name.")
    short_name: str | None = Field(default=None, description="The organization's short name.")
    doing_business_as: str | None = Field(
        default=None, description="Trading name (DBA) if different from the registered name."
    )
    # Business identity
    industry: str | None = Field(default=None, description="Industry the organization operates in.")
    business_type: str | None = Field(
        default=None,
        description="Legal/business structure.",
        examples=["sole_proprietorship", "partnership", "limited_company", "other"],
    )
    registration_number: str | None = Field(
        default=None, description="Company/business registration number (e.g. Companies Office of Jamaica)."
    )
    trn: str | None = Field(default=None, description="Taxpayer Registration Number (Jamaica).")
    nis_number: str | None = Field(default=None, description="National Insurance Scheme number (Jamaica).")
    gct_number: str | None = Field(default=None, description="GCT registration number (Jamaica).")
    tax_id: str | None = Field(default=None, description="Generic tax identifier for non-Jamaican orgs.")
    incorporation_date: str | None = Field(
        default=None, description="Date of incorporation/registration (ISO 8601 date)."
    )
    fax: str | None = Field(default=None, description="Fax number.")
    primary_contact_user_id: str | None = Field(
        default=None, description="User ID of the organization's primary contact (defaults to the owner)."
    )
    timezone: str | None = Field(default=None, description="IANA timezone name.", examples=["America/Jamaica"])
    language: str | None = Field(default=None, description="Default language (BCP 47).", examples=["en-JM"])
    slug: str | None = Field(default=None, description="URL-safe unique identifier for the organization.")
    status: str | None = Field(default=None, description="The organization's status.")
    logo_url: str | None = Field(
        default=None,
        description="URL of the organization's logo image. Set to null to clear it.",
    )
    # Contact
    primary_phone: str | None = Field(default=None, description="Primary phone number.")
    primary_email: str | None = Field(default=None, description="Primary contact email address.")
    website_url: str | None = Field(default=None, description="Organization website URL.")
    support_url: str | None = Field(default=None, description="Customer support URL.")
    # Address
    address_line1: str | None = Field(default=None, description="Street address line 1.")
    address_line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    currency_code: str | None = Field(default=None, description="ISO 4217 currency code.")
    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Arbitrary key-value metadata. Set to null to clear it.",
    )


class OrgSetupRequest(BaseModel):
    """Session-scoped org setup — required fields for self-service enrollment completion."""

    organization_id: str = Field(
        description="The organization to complete setup for.",
        alias="organizationId",
    )
    name: str = Field(description="The organization's display name.")
    slug: str = Field(description="URL-safe unique identifier for the organization.")
    primary_phone: str = Field(description="Primary phone number.")
    address_line1: str = Field(description="Street address line 1.")
    city: str = Field(description="City or town.")
    region_id: str = Field(description="Region (parish/state) identifier.", alias="regionId")
    country_code: str = Field(description="ISO 3166-1 alpha-2 country code.", alias="countryCode")
    currency_code: str = Field(
        description="ISO 4217 currency code.",
        alias="currencyCode",
        examples=["JMD"],
    )
    # Optional fields
    primary_email: str | None = Field(default=None, description="Primary contact email address.")
    website_url: str | None = Field(default=None, alias="websiteUrl", description="Organization website URL.")
    support_url: str | None = Field(default=None, alias="supportUrl", description="Customer support URL.")
    address_line2: str | None = Field(default=None, alias="addressLine2", description="Street address line 2.")

    model_config = ConfigDict(populate_by_name=True)


class InviteTokenResponse(BaseModel):
    object: Literal["invite_token"] = Field(default="invite_token", description="Always 'invite_token'.")
    id: str = Field(description="Unique identifier for the invite token.")
    organization_id: str = Field(description="Organization the invite is for.")
    email: str = Field(description="Email address of the invitee.")
    role: str = Field(description="Role the invitee will receive.", examples=["member", "admin"])
    status: str = Field(description="Invite status.", examples=["pending", "accepted", "expired", "revoked"])
    expires_at: int = Field(description="Unix timestamp when the invite expires.")
    source_app_id: str | None = Field(
        default=None,
        description="App the invite was issued from. Accepting the invite auto-assigns the member to this app.",
    )
    created_at: int = Field(description="Unix timestamp when the invite was created.")

    model_config = ConfigDict(from_attributes=True)


class InviteTokenCreate(BaseModel):
    email: str = Field(description="Email address of the person to invite.")
    role: str | None = Field(
        default=None,
        description="Org role name to assign (system or custom). Defaults to 'member'.",
        examples=["member", "admin", "billing_manager"],
    )
    source_app_id: str | None = Field(
        default=None,
        description="ID of the app issuing the invite. Accepting auto-assigns the member to this app.",
    )
    source_app_slug: str | None = Field(
        default=None,
        description="Slug of the app issuing the invite (alternative to source_app_id).",
    )


class InvitePublicResponse(BaseModel):
    """Safe invite preview for public (unauthenticated) lookup — no token or internal IDs."""

    object: Literal["invite_preview"] = Field(default="invite_preview", description="Always 'invite_preview'.")
    org_name: str | None = Field(description="Display name of the inviting organization.")
    org_slug: str = Field(description="Slug of the inviting organization.")
    email: str = Field(description="Email address the invite was sent to.")
    role: str = Field(description="Role the invitee will receive.")
    expires_at: int = Field(description="Unix timestamp when the invite expires.")


class OrganizationDeleteResponse(BaseModel):
    object: Literal["organization"] = "organization"
    id: str
    deleted: bool = True


class SubscriptionItemResponse(BaseModel):
    object: Literal["subscription_item"] = "subscription_item"
    id: str = Field(description="Unique identifier for the subscription item.")
    price_id: str = Field(description="ID of the subscribed price.")
    product_id: str | None = Field(default=None, description="ID of the price's product.")
    product_slug: str | None = Field(default=None, description="Slug of the price's product.")
    product_name: str | None = Field(default=None, description="Name of the price's product.")
    quantity: int = Field(description="Quantity of this price on the subscription.")
    billing_thresholds: dict[str, Any] | None = Field(
        default=None,
        description="Define thresholds at which an invoice will be sent.",
    )
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
        description="Arbitrary key-value metadata attached to the subscription item.",
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


SubscriptionStatus = Literal[
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
    "blocked",
]


class SubscriptionResponse(BaseModel):
    object: Literal["subscription"] = "subscription"
    id: str = Field(description="Unique identifier for the subscription.")
    billing_account_id: str | None = Field(default=None, description="ID of the billing account.")
    organization_id: str = Field(description="ID of the organization.")
    app_id: str = Field(description="ID of the platform app.")
    app_slug: str | None = Field(default=None, description="Slug of the platform app.")
    app_name: str | None = Field(default=None, description="Display name of the platform app.")
    app_logo_url: str | None = Field(default=None, description="Logo URL for the platform app.")
    app_kind: str | None = Field(default=None, description="Kind of platform app.")
    status: str = Field(
        description=(
            "Subscription status. One of: incomplete, incomplete_expired, trialing, active, "
            "past_due, canceled, unpaid, paused, blocked."
        ),
        examples=["active", "blocked"],
    )
    provider_status: str | None = Field(default=None, description="Original status from the billing provider.")
    status_reason: str | None = Field(default=None, description="Reason for the current status.")
    finance_lifecycle_version: int = Field(
        ge=0,
        description="Latest embedded-finance connection revision contributed to by this entitlement.",
    )
    collection_method: str = Field(
        default="charge_automatically",
        description="Either `charge_automatically`, or `send_invoice`.",
    )
    billing_cycle_anchor: int | None = Field(default=None, description="Unix timestamp of the billing cycle anchor.")

    items: list[SubscriptionItemResponse] = Field(default_factory=list, description="Line items on this subscription.")

    current_period_start: int | None = Field(default=None, description="Unix timestamp for the current period start.")
    current_period_end: int | None = Field(default=None, description="Unix timestamp for the current period end.")
    cancel_at: int | None = Field(
        default=None,
        description="A date in the future at which the subscription will automatically get canceled.",
    )
    cancel_at_period_end: bool = Field(description="Whether the subscription cancels at the end of the current period.")
    canceled_at: int | None = Field(default=None, description="Unix timestamp when the subscription was canceled.")
    ended_at: int | None = Field(default=None, description="Unix timestamp when the subscription ended.")

    pause_collection: dict[str, Any] | None = Field(
        default=None,
        description="If specified, payment collection for this subscription will be paused.",
    )
    trial_start: int | None = Field(default=None, description="Unix timestamp when the trial started.")
    trial_end: int | None = Field(default=None, description="Unix timestamp when the trial ends.")
    start_date: int | None = Field(default=None, description="Unix timestamp when the subscription first started.")

    default_payment_method_id: str | None = Field(default=None, description="ID of the default payment method.")
    latest_invoice_id: str | None = Field(default=None, description="ID of the most recent invoice.")
    pending_update: dict[str, Any] | None = Field(
        default=None,
        description="Specifies an update to this subscription that will be applied.",
    )
    schedule_id: str | None = Field(default=None, description="ID of the subscription schedule.")

    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
        description="Arbitrary key-value metadata.",
    )

    created_at: int = Field(description="Unix timestamp when the subscription was created.")
    updated_at: int = Field(description="Unix timestamp when the subscription was last updated.")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SubscriptionProvisionRequest(BaseModel):
    app_id: str | None = Field(default=None, description="ID of the app to subscribe to.")
    app_slug: str | None = Field(default=None, description="Slug of the app to subscribe to.")
    price_id: str | None = Field(
        default=None, description="ID of the price to subscribe to. Defaults to the app's default price."
    )


class SubscriptionUpdateRequest(BaseModel):
    status: SubscriptionStatus | None = Field(default=None, description="New subscription status.")
    price_id: str | None = Field(default=None, description="New price ID to switch the org's single line item onto.")
    cancel_at_period_end: bool | None = Field(
        default=None, description="Whether the subscription should cancel at the end of the current period."
    )


class SubscriptionBatchResponse(BaseModel):
    object: Literal["list"] = "list"
    data: list[SubscriptionResponse]
    total_count: int


# ── Org structure: locations, departments, employee profiles ─────────────────


class OrgLocationResponse(BaseModel):
    object: Literal["org_location"] = Field(
        default="org_location",
        description="String representing the object's type. Always 'org_location'.",
    )
    id: str = Field(description="Unique identifier for the location.")
    organization_id: str = Field(description="ID of the organization this location belongs to.")
    name: str = Field(description="Display name of the location.", examples=["Kingston HQ"])
    code: str | None = Field(
        default=None,
        description="Short internal code, unique within the organization.",
        examples=["KGN-01"],
    )
    type: str = Field(
        description="Kind of site.",
        examples=["headquarters", "branch", "office", "store", "warehouse", "remote", "other"],
    )
    status: str = Field(description="The location's status.", examples=["active", "inactive"])
    is_primary: bool = Field(description="Whether this is the organization's primary location.")
    phone: str | None = Field(default=None, description="Location phone number.")
    email: str | None = Field(default=None, description="Location contact email address.")
    line1: str | None = Field(default=None, description="Street address line 1.")
    line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    timezone: str | None = Field(default=None, description="IANA timezone name.", examples=["America/Jamaica"])
    metadata: dict[str, Any] | None = Field(
        default=None, description="Arbitrary key-value metadata attached to the location."
    )
    deleted_at: int | None = Field(
        default=None, description="Unix timestamp when the location was soft-deleted. Null means active."
    )
    deleted_by: str | None = Field(default=None, description="ID of the actor who deleted this location.")
    deletion_reason: str | None = Field(default=None, description="Optional reason recorded at deletion time.")
    created_at: int = Field(description="Creation time, in seconds since the Unix epoch.")
    updated_at: int = Field(description="Last update time, in seconds since the Unix epoch.")


class OrgLocationCreate(BaseModel):
    name: str = Field(description="Display name of the location.", min_length=1)
    code: str | None = Field(default=None, description="Short internal code, unique within the organization.")
    type: str | None = Field(default=None, description="Kind of site. Defaults to 'office'.")
    status: str | None = Field(default=None, description="Initial status. Defaults to 'active'.")
    is_primary: bool | None = Field(
        default=None, description="Mark as the organization's primary location (clears any previous primary)."
    )
    phone: str | None = Field(default=None, description="Location phone number.")
    email: str | None = Field(default=None, description="Location contact email address.")
    line1: str | None = Field(default=None, description="Street address line 1.")
    line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    timezone: str | None = Field(default=None, description="IANA timezone name.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgLocationUpdate(BaseModel):
    name: str | None = Field(default=None, description="Display name of the location.")
    code: str | None = Field(default=None, description="Short internal code, unique within the organization.")
    type: str | None = Field(default=None, description="Kind of site.")
    status: str | None = Field(default=None, description="The location's status.")
    is_primary: bool | None = Field(
        default=None, description="Mark as the organization's primary location (clears any previous primary)."
    )
    phone: str | None = Field(default=None, description="Location phone number.")
    email: str | None = Field(default=None, description="Location contact email address.")
    line1: str | None = Field(default=None, description="Street address line 1.")
    line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    timezone: str | None = Field(default=None, description="IANA timezone name.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgLocationDeleteResponse(BaseModel):
    object: Literal["org_location"] = "org_location"
    id: str = Field(description="ID of the deleted location.")
    deleted: bool = Field(default=True, description="Always true.")


class OrgContactResponse(BaseModel):
    object: Literal["org_contact"] = Field(
        default="org_contact",
        description="String representing the object's type. Always 'org_contact'.",
    )
    id: str = Field(description="Unique identifier for the contact.")
    organization_id: str = Field(description="ID of the organization this contact belongs to.")
    user_id: str | None = Field(
        default=None,
        description="ID of the platform user when the contact is an org member. Null for external contacts.",
    )
    first_name: str = Field(description="Contact's first name.", examples=["Alejandra"])
    last_name: str | None = Field(default=None, description="Contact's last name.", examples=["Reyes"])
    title: str | None = Field(default=None, description="Job title or role label.", examples=["Finance Director"])
    type: str = Field(
        description="Kind of contact.",
        examples=["general", "billing", "technical", "legal", "emergency", "other"],
    )
    is_primary: bool = Field(description="Whether this is the organization's primary contact.")
    email: str | None = Field(default=None, description="Contact email address.")
    phone: str | None = Field(default=None, description="Contact phone number.")
    mobile: str | None = Field(default=None, description="Contact mobile number.")
    notes: str | None = Field(default=None, description="Free-form internal notes about the contact.")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Arbitrary key-value metadata attached to the contact."
    )
    deleted_at: int | None = Field(
        default=None, description="Unix timestamp when the contact was soft-deleted. Null means active."
    )
    deleted_by: str | None = Field(default=None, description="ID of the actor who deleted this contact.")
    deletion_reason: str | None = Field(default=None, description="Optional reason recorded at deletion time.")
    created_at: int = Field(description="Creation time, in seconds since the Unix epoch.")
    updated_at: int = Field(description="Last update time, in seconds since the Unix epoch.")


class OrgContactCreate(BaseModel):
    user_id: str | None = Field(
        default=None,
        description="Link the contact to a platform user. Must be an active member of the organization.",
    )
    first_name: str = Field(description="Contact's first name.", min_length=1)
    last_name: str | None = Field(default=None, description="Contact's last name.")
    title: str | None = Field(default=None, description="Job title or role label.")
    type: str | None = Field(default=None, description="Kind of contact. Defaults to 'general'.")
    is_primary: bool | None = Field(
        default=None, description="Mark as the organization's primary contact (clears any previous primary)."
    )
    email: str | None = Field(default=None, description="Contact email address.")
    phone: str | None = Field(default=None, description="Contact phone number.")
    mobile: str | None = Field(default=None, description="Contact mobile number.")
    notes: str | None = Field(default=None, description="Free-form internal notes about the contact.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgContactUpdate(BaseModel):
    user_id: str | None = Field(
        default=None,
        description="Link the contact to a platform user (must be an active org member). Null unlinks.",
    )
    first_name: str | None = Field(default=None, description="Contact's first name.")
    last_name: str | None = Field(default=None, description="Contact's last name.")
    title: str | None = Field(default=None, description="Job title or role label.")
    type: str | None = Field(default=None, description="Kind of contact.")
    is_primary: bool | None = Field(
        default=None, description="Mark as the organization's primary contact (clears any previous primary)."
    )
    email: str | None = Field(default=None, description="Contact email address.")
    phone: str | None = Field(default=None, description="Contact phone number.")
    mobile: str | None = Field(default=None, description="Contact mobile number.")
    notes: str | None = Field(default=None, description="Free-form internal notes about the contact.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgContactDeleteResponse(BaseModel):
    object: Literal["org_contact"] = "org_contact"
    id: str = Field(description="ID of the deleted contact.")
    deleted: bool = Field(default=True, description="Always true.")


class OrgDepartmentResponse(BaseModel):
    object: Literal["org_department"] = Field(
        default="org_department",
        description="String representing the object's type. Always 'org_department'.",
    )
    id: str = Field(description="Unique identifier for the department.")
    organization_id: str = Field(description="ID of the organization this department belongs to.")
    name: str = Field(description="Display name of the department.", examples=["Engineering"])
    code: str | None = Field(
        default=None, description="Short internal code, unique within the organization.", examples=["ENG"]
    )
    description: str | None = Field(default=None, description="Free-form description of the department.")
    parent_department_id: str | None = Field(
        default=None, description="ID of the parent department, for nested org structures."
    )
    head_membership_id: str | None = Field(default=None, description="Membership ID of the department head.")
    status: str = Field(description="The department's status.", examples=["active", "inactive"])
    metadata: dict[str, Any] | None = Field(
        default=None, description="Arbitrary key-value metadata attached to the department."
    )
    deleted_at: int | None = Field(
        default=None, description="Unix timestamp when the department was soft-deleted. Null means active."
    )
    deleted_by: str | None = Field(default=None, description="ID of the actor who deleted this department.")
    deletion_reason: str | None = Field(default=None, description="Optional reason recorded at deletion time.")
    created_at: int = Field(description="Creation time, in seconds since the Unix epoch.")
    updated_at: int = Field(description="Last update time, in seconds since the Unix epoch.")


class OrgDepartmentCreate(BaseModel):
    name: str = Field(description="Display name of the department.", min_length=1)
    code: str | None = Field(default=None, description="Short internal code, unique within the organization.")
    description: str | None = Field(default=None, description="Free-form description of the department.")
    parent_department_id: str | None = Field(default=None, description="ID of the parent department.")
    head_membership_id: str | None = Field(default=None, description="Membership ID of the department head.")
    status: str | None = Field(default=None, description="Initial status. Defaults to 'active'.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgDepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, description="Display name of the department.")
    code: str | None = Field(default=None, description="Short internal code, unique within the organization.")
    description: str | None = Field(default=None, description="Free-form description of the department.")
    parent_department_id: str | None = Field(default=None, description="ID of the parent department.")
    head_membership_id: str | None = Field(default=None, description="Membership ID of the department head.")
    status: str | None = Field(default=None, description="The department's status.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class OrgDepartmentDeleteResponse(BaseModel):
    object: Literal["org_department"] = "org_department"
    id: str = Field(description="ID of the deleted department.")
    deleted: bool = Field(default=True, description="Always true.")


class EmployeeProfileResponse(BaseModel):
    object: Literal["employee_profile"] = Field(
        default="employee_profile",
        description="String representing the object's type. Always 'employee_profile'.",
    )
    id: str = Field(description="Unique identifier for the employee profile.")
    membership_id: str = Field(description="ID of the org membership this profile extends (1:1).")
    organization_id: str = Field(description="ID of the organization.")
    user_id: str | None = Field(default=None, description="ID of the 876 user behind the membership, when resolvable.")
    employee_number: str | None = Field(
        default=None, description="Employer-assigned identifier, unique within the organization."
    )
    job_title: str | None = Field(default=None, description="Job title.", examples=["Senior Engineer"])
    department_id: str | None = Field(default=None, description="ID of the department.")
    location_id: str | None = Field(default=None, description="ID of the work location.")
    manager_membership_id: str | None = Field(
        default=None, description="Membership ID of this employee's manager (reporting line)."
    )
    employment_type: str | None = Field(
        default=None,
        description="Employment arrangement.",
        examples=["full_time", "part_time", "contract", "intern", "temporary", "other"],
    )
    employment_status: str = Field(
        description="Employment lifecycle status.",
        examples=["active", "on_leave", "suspended", "terminated"],
    )
    division: str | None = Field(default=None, description="Division name (SCIM enterprise attribute).")
    cost_center: str | None = Field(default=None, description="Cost center name (SCIM enterprise attribute).")
    work_email: str | None = Field(default=None, description="Work email address.")
    work_phone: str | None = Field(default=None, description="Work phone number.")
    start_date: int | None = Field(default=None, description="Employment start date, in seconds since the Unix epoch.")
    end_date: int | None = Field(default=None, description="Employment end date, in seconds since the Unix epoch.")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Arbitrary key-value metadata attached to the profile."
    )
    deleted_at: int | None = Field(
        default=None, description="Unix timestamp when the profile was soft-deleted. Null means active."
    )
    deleted_by: str | None = Field(default=None, description="ID of the actor who deleted this profile.")
    deletion_reason: str | None = Field(default=None, description="Optional reason recorded at deletion time.")
    created_at: int = Field(description="Creation time, in seconds since the Unix epoch.")
    updated_at: int = Field(description="Last update time, in seconds since the Unix epoch.")


class EmployeeProfileCreate(BaseModel):
    membership_id: str = Field(description="ID of the org membership to attach the profile to.")
    employee_number: str | None = Field(
        default=None, description="Employer-assigned identifier, unique within the organization."
    )
    job_title: str | None = Field(default=None, description="Job title.")
    department_id: str | None = Field(default=None, description="ID of the department.")
    location_id: str | None = Field(default=None, description="ID of the work location.")
    manager_membership_id: str | None = Field(default=None, description="Membership ID of this employee's manager.")
    employment_type: str | None = Field(default=None, description="Employment arrangement.")
    employment_status: str | None = Field(
        default=None, description="Employment lifecycle status. Defaults to 'active'."
    )
    division: str | None = Field(default=None, description="Division name.")
    cost_center: str | None = Field(default=None, description="Cost center name.")
    work_email: str | None = Field(default=None, description="Work email address.")
    work_phone: str | None = Field(default=None, description="Work phone number.")
    start_date: int | None = Field(default=None, description="Employment start date (Unix seconds).")
    end_date: int | None = Field(default=None, description="Employment end date (Unix seconds).")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class EmployeeProfileUpdate(BaseModel):
    employee_number: str | None = Field(
        default=None, description="Employer-assigned identifier, unique within the organization."
    )
    job_title: str | None = Field(default=None, description="Job title.")
    department_id: str | None = Field(default=None, description="ID of the department.")
    location_id: str | None = Field(default=None, description="ID of the work location.")
    manager_membership_id: str | None = Field(default=None, description="Membership ID of this employee's manager.")
    employment_type: str | None = Field(default=None, description="Employment arrangement.")
    employment_status: str | None = Field(default=None, description="Employment lifecycle status.")
    division: str | None = Field(default=None, description="Division name.")
    cost_center: str | None = Field(default=None, description="Cost center name.")
    work_email: str | None = Field(default=None, description="Work email address.")
    work_phone: str | None = Field(default=None, description="Work phone number.")
    start_date: int | None = Field(default=None, description="Employment start date (Unix seconds).")
    end_date: int | None = Field(default=None, description="Employment end date (Unix seconds).")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class EmployeeProfileDeleteResponse(BaseModel):
    object: Literal["employee_profile"] = "employee_profile"
    id: str = Field(description="ID of the deleted employee profile.")
    deleted: bool = Field(default=True, description="Always true.")


class OrganizationSelfUpdate(BaseModel):
    """Org-self-scoped details update — excludes platform-controlled fields (slug, status, WorkOS ID)."""

    name: str | None = Field(default=None, description="The organization's display name.")
    short_name: str | None = Field(default=None, description="The organization's short name.")
    doing_business_as: str | None = Field(
        default=None, description="Trading name (DBA) if different from the registered name."
    )
    logo_url: str | None = Field(default=None, description="URL of the organization's logo image.")
    industry: str | None = Field(default=None, description="Industry the organization operates in.")
    business_type: str | None = Field(default=None, description="Legal/business structure.")
    registration_number: str | None = Field(default=None, description="Company/business registration number.")
    trn: str | None = Field(default=None, description="Taxpayer Registration Number (Jamaica).")
    nis_number: str | None = Field(default=None, description="National Insurance Scheme number (Jamaica).")
    gct_number: str | None = Field(default=None, description="GCT registration number (Jamaica).")
    tax_id: str | None = Field(default=None, description="Generic tax identifier for non-Jamaican orgs.")
    incorporation_date: str | None = Field(
        default=None, description="Date of incorporation/registration (ISO 8601 date)."
    )
    primary_phone: str | None = Field(default=None, description="Primary phone number.")
    primary_email: str | None = Field(default=None, description="Primary contact email address.")
    fax: str | None = Field(default=None, description="Fax number.")
    website_url: str | None = Field(default=None, description="Organization website URL.")
    support_url: str | None = Field(default=None, description="Customer support URL.")
    primary_contact_user_id: str | None = Field(
        default=None, description="User ID of the organization's primary contact."
    )
    address_line1: str | None = Field(default=None, description="Street address line 1.")
    address_line2: str | None = Field(default=None, description="Street address line 2.")
    city: str | None = Field(default=None, description="City or town.")
    region_id: str | None = Field(default=None, description="Region (parish/state) identifier.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 country code.")
    currency_code: str | None = Field(default=None, description="ISO 4217 currency code.")
    timezone: str | None = Field(default=None, description="IANA timezone name.")
    language: str | None = Field(default=None, description="Default language (BCP 47).")


# ── Org roles, permissions, and app assignments ──────────────────────────────


class OrganizationRoleResponse(BaseModel):
    object: Literal["organization_role"] = Field(default="organization_role", description="Always 'organization_role'.")
    id: str = Field(description="Unique identifier for the role.")
    organization_id: str = Field(description="Organization the role belongs to.")
    name: str = Field(description="Unique role name within the organization.", examples=["admin", "dispatcher"])
    display_name: str = Field(description="Human-readable role name.", examples=["Admin"])
    description: str | None = Field(default=None, description="What the role is for.")
    permissions: list[str] = Field(description="Permission strings granted by this role.")
    is_system: bool = Field(description="True for default roles seeded at org creation; immutable.")
    members_count: int | None = Field(default=None, description="Number of memberships linked to this role.")
    created_at: int = Field(description="Unix timestamp when the role was created.")
    updated_at: int = Field(description="Unix timestamp when the role was last updated.")

    model_config = ConfigDict(from_attributes=True)


class OrganizationRoleCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=64,
        pattern=r"^[a-z0-9][a-z0-9_-]*$",
        description="Unique role name (lowercase, digits, hyphen/underscore).",
    )
    display_name: str = Field(min_length=1, max_length=100, description="Human-readable role name.")
    description: str | None = Field(default=None, max_length=500, description="What the role is for.")
    permissions: list[str] = Field(description="Permission strings from the catalog to grant.")


class OrganizationRoleUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: list[str] | None = Field(default=None, description="Replacement permission set.")


class OrganizationRoleDeleteResponse(BaseModel):
    object: Literal["organization_role"] = "organization_role"
    id: str
    deleted: bool = True


class PermissionGroupResponse(BaseModel):
    name: str = Field(description="Display name of the permission group.", examples=["Members"])
    permissions: list[str] = Field(description="Permission strings in this group.")


class PermissionCatalogResponse(BaseModel):
    object: Literal["permission_catalog"] = Field(
        default="permission_catalog", description="Always 'permission_catalog'."
    )
    groups: list[PermissionGroupResponse] = Field(description="Grouped org permission catalog.")


class OrganizationMemberResponse(BaseModel):
    object: Literal["organization_member"] = Field(
        default="organization_member", description="Always 'organization_member'."
    )
    id: str = Field(description="Membership identifier.")
    user_id: str = Field(description="Platform user identifier.")
    role: str = Field(description="Role name within the organization.")
    role_id: str | None = Field(default=None, description="Linked organization role ID.")
    status: str = Field(description="Membership status.", examples=["active", "invited", "suspended"])
    first_name: str | None = Field(default=None, description="Member's first name.")
    last_name: str | None = Field(default=None, description="Member's last name.")
    email: str | None = Field(default=None, description="Member's email address.")
    avatar: str | None = Field(default=None, description="Member's avatar URL.")
    created_at: int = Field(description="Unix timestamp when the membership was created.")


class OrganizationMemberMeResponse(OrganizationMemberResponse):
    permissions: list[str] = Field(description="Effective org permissions for the caller.")


class OrganizationMemberRoleUpdate(BaseModel):
    role: str = Field(min_length=1, max_length=64, description="Org role name to assign (system or custom).")


class AppAssignmentResponse(BaseModel):
    object: Literal["app_assignment"] = Field(default="app_assignment", description="Always 'app_assignment'.")
    id: str = Field(description="Unique identifier for the assignment.")
    organization_id: str = Field(description="Organization the assignment belongs to.")
    user_id: str = Field(description="Assigned member's platform user ID.")
    app_id: str = Field(description="ID of the assigned app.")
    app_slug: str | None = Field(default=None, description="Slug of the assigned app.")
    app_name: str | None = Field(default=None, description="Display name of the assigned app.")
    status: str = Field(description="Assignment status.", examples=["active", "revoked"])
    assigned_by: str | None = Field(default=None, description="User ID of the member who granted access.")
    created_at: int = Field(description="Unix timestamp when the assignment was created.")
    updated_at: int = Field(description="Unix timestamp when the assignment was last updated.")


class AppAssignmentCreate(BaseModel):
    user_id: str = Field(description="Platform user ID of the member to assign.")
    app_id: str | None = Field(default=None, description="ID of the app to assign.")
    app_slug: str | None = Field(default=None, description="Slug of the app to assign (alternative to app_id).")
