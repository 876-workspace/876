from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from domains.organizations.schemas import SubscriptionResponse


class BillingAccountResponse(BaseModel):
    object: Literal["billing_account"] = "billing_account"
    id: str = Field(description="Unique identifier for the billing account.")
    organization_id: str = Field(description="ID of the organization.")
    name: str | None = Field(default=None, description="Name of the billing account.")
    email: str | None = Field(default=None, description="Email address of the billing account.")
    invoice_email: str | None = Field(default=None, description="Email address for invoices.")
    currency: str | None = Field(default=None, description="Three-letter ISO currency code.")
    tax_exempt: str | None = Field(default=None, description="Tax exemption status.")
    balance: int = Field(default=0, description="Account balance.")
    default_payment_method_id: str | None = Field(default=None, description="ID of the default payment method.")

    invoice_settings: dict[str, Any] | None = Field(default=None, description="Invoice settings.")
    preferred_locales: dict[str, Any] | None = Field(default=None, description="Preferred locales.")
    address: dict[str, Any] | None = Field(default=None, description="Billing address.")
    shipping: dict[str, Any] | None = Field(default=None, description="Shipping address.")

    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
        description="Arbitrary key-value metadata.",
    )

    subscriptions: list[SubscriptionResponse] | None = Field(
        default=None,
        description="Subscriptions attached to this account.",
    )

    created_at: int = Field(description="Unix timestamp when the account was created.")
    updated_at: int = Field(description="Unix timestamp when the account was last updated.")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SubscriptionItemCreate(BaseModel):
    price_id: str = Field(description="ID of the price to attach.")
    quantity: int = Field(default=1, description="Quantity of the price.")


class SubscriptionItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, description="Quantity of the price.")
    price_id: str | None = Field(default=None, description="ID of the price to use.")


class SubscriptionItemDeleteResponse(BaseModel):
    object: Literal["subscription_item"] = "subscription_item"
    id: str
    deleted: bool = True


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


class SubscriptionCreate(BaseModel):
    organization_id: str = Field(description="ID of the organization.")
    app_id: str = Field(description="ID of the app to subscribe to.")
    price_id: str | None = Field(default=None, description="ID of the initial price line item.")
    billing_account_id: str | None = Field(default=None, description="ID of the billing account.")
    status: SubscriptionStatus | None = Field(default=None, description="Initial subscription status.")
    collection_method: str | None = Field(default=None, description="Subscription collection method.")
    cancel_at_period_end: bool | None = Field(default=None, description="Whether to cancel at period end.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class SubscriptionUpdate(BaseModel):
    billing_account_id: str | None = Field(default=None, description="ID of the billing account.")
    status: SubscriptionStatus | None = Field(default=None, description="New subscription status.")
    collection_method: str | None = Field(default=None, description="Subscription collection method.")
    cancel_at_period_end: bool | None = Field(default=None, description="Whether to cancel at period end.")
    price_id: str | None = Field(default=None, description="Price ID to switch the single line item onto.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class SubscriptionDeleteResponse(BaseModel):
    object: Literal["subscription"] = "subscription"
    id: str
    deleted: bool = True


class FinanceProvisioningReconcileRequest(BaseModel):
    app_id: str | None = Field(default=None, description="Optional app whose subscriptions should be reconciled.")
    limit: int = Field(default=1_000, ge=1, le=10_000)
    starting_after: str | None = Field(
        default=None,
        description="Subscription ID cursor returned by the previous reconciliation page.",
    )


class FinanceProvisioningReconcileResponse(BaseModel):
    object: Literal["finance_provisioning_reconciliation"] = "finance_provisioning_reconciliation"
    scanned: int
    enqueued: int
    next_cursor: str | None


class FinanceProvisioningDispatchResponse(BaseModel):
    object: Literal["finance_provisioning_dispatch"] = "finance_provisioning_dispatch"
    claimed: int
    delivered: int
    failed: int
    configured: bool


class BillingCustomerSyncDispatchResponse(BaseModel):
    object: Literal["billing_customer_sync_dispatch"] = "billing_customer_sync_dispatch"
    claimed: int
    delivered: int
    failed: int
    configured: bool


class BillingCustomerSyncReconcileResponse(BaseModel):
    object: Literal["billing_customer_sync_reconcile"] = "billing_customer_sync_reconcile"
    organizations: int
    users: int


class BillingAccountCreate(BaseModel):
    organization_id: str = Field(description="ID of the organization.")
    name: str | None = Field(default=None, description="Name of the billing account.")
    email: str | None = Field(default=None, description="Email address of the billing account.")
    invoice_email: str | None = Field(default=None, description="Email address for invoices.")
    currency: str = Field(default="JMD", description="Three-letter ISO currency code.")
    tax_exempt: str | None = Field(default=None, description="Tax exemption status.")

    invoice_settings: dict[str, Any] | None = Field(default=None, description="Invoice settings.")
    preferred_locales: dict[str, Any] | None = Field(default=None, description="Preferred locales.")
    address: dict[str, Any] | None = Field(default=None, description="Billing address.")
    shipping: dict[str, Any] | None = Field(default=None, description="Shipping address.")

    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class BillingAccountUpdate(BaseModel):
    name: str | None = Field(default=None, description="Name of the billing account.")
    email: str | None = Field(default=None, description="Email address of the billing account.")
    invoice_email: str | None = Field(default=None, description="Email address for invoices.")
    currency: str | None = Field(default=None, description="Three-letter ISO currency code.")
    tax_exempt: str | None = Field(default=None, description="Tax exemption status.")
    default_payment_method_id: str | None = Field(default=None, description="ID of the default payment method.")

    invoice_settings: dict[str, Any] | None = Field(default=None, description="Invoice settings.")
    preferred_locales: dict[str, Any] | None = Field(default=None, description="Preferred locales.")
    address: dict[str, Any] | None = Field(default=None, description="Billing address.")
    shipping: dict[str, Any] | None = Field(default=None, description="Shipping address.")

    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class BillingAccountDeleteResponse(BaseModel):
    object: Literal["billing_account"] = "billing_account"
    id: str
    deleted: bool = True


class BillingProviderObjectResponse(BaseModel):
    object: Literal["billing_provider_object"] = "billing_provider_object"
    id: str = Field(description="Unique identifier.")
    provider: str = Field(description="Provider name, e.g. stripe.")
    provider_object_type: str = Field(description="Type of object in the provider, e.g. customer.")
    provider_object_id: str = Field(description="ID of the object in the provider.")

    internal_object_type: str = Field(description="Type of internal object.")
    internal_object_id: str = Field(description="ID of the internal object.")

    livemode: bool = Field(description="Whether this is a livemode object.")
    synced_at: int | None = Field(default=None, description="Unix timestamp of the last sync.")
    raw_payload: dict[str, Any] | None = Field(default=None, description="Raw payload from the provider.")

    created_at: int = Field(description="Unix timestamp when this mapping was created.")
    updated_at: int = Field(description="Unix timestamp when this mapping was last updated.")

    model_config = ConfigDict(from_attributes=True)
