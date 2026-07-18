from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PriceResponse(BaseModel):
    object: Literal["price"] = Field(
        default="price",
        description="String representing the object's type. Always 'price'.",
    )
    id: str = Field(description="Unique identifier for the price.")
    product_id: str = Field(description="ID of the product this price belongs to.")

    # Legacy fields
    billing_interval: str | None = Field(default=None, description="Legacy recurring billing interval.")
    interval_count: int | None = Field(default=None, description="Legacy interval count.")
    status: str = Field(description="Legacy price status.", examples=["active", "archived"])

    # New / Modified fields
    unit_amount: int | None = Field(
        default=None,
        description="Price per billing interval, in the smallest unit of `currency`.",
    )
    unit_amount_decimal: str | None = Field(default=None, description="Decimal representation of the unit amount.")
    currency: str = Field(description="Three-letter ISO currency code.", examples=["jmd"])

    lookup_key: str | None = Field(default=None, description="A lookup key used to retrieve prices dynamically.")
    name: str | None = Field(default=None, description="A brief name of the price.")
    nickname: str | None = Field(default=None, description="A brief description of the price, hidden from customers.")
    type: str = Field(description="One of `one_time` or `recurring`.")
    billing_scheme: str = Field(description="Describes how to compute the price per period.")
    tiers_mode: str | None = Field(
        default=None,
        description="Defines if the tiering price should be `graduated` or `volume` based.",
    )
    tiers: list[dict[str, Any]] | None = Field(default=None, description="Each element represents a pricing tier.")
    recurring: dict[str, Any] | None = Field(
        default=None,
        description="The recurring components of a price such as `interval` and `usage_type`.",
    )
    tax_behavior: str | None = Field(
        default=None,
        description="Specifies whether the price is considered inclusive of taxes or exclusive of taxes.",
    )
    transform_quantity: dict[str, Any] | None = Field(
        default=None,
        description="Apply a transformation to the reported usage or set quantity.",
    )
    trial_period_days: int | None = Field(
        default=None,
        description="Default number of trial days when subscribing a customer to this price.",
    )
    active: bool = Field(description="Whether the price can be used for new purchases.")
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
        description="Arbitrary key-value metadata attached to the price.",
    )

    created_at: int = Field(description="Unix timestamp when the price was created.")
    updated_at: int = Field(description="Unix timestamp when the price was last updated.")
    archived_at: int | None = Field(default=None, description="Unix timestamp when the price was archived.")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PriceCreateRequest(BaseModel):
    unit_amount: int | None = Field(
        default=None,
        description="Price per billing interval, in the smallest unit of currency.",
    )
    currency: str = Field(default="jmd", description="Three-letter ISO currency code.")
    recurring: dict[str, Any] | None = Field(default=None, description="The recurring components of a price.")
    lookup_key: str | None = Field(default=None, description="A lookup key used to retrieve prices dynamically.")
    name: str | None = Field(default=None, description="A brief name of the price.")
    nickname: str | None = Field(default=None, description="A brief description of the price, hidden from customers.")
    type: Literal["one_time", "recurring"] = Field(default="recurring", description="One of `one_time` or `recurring`.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")

    # Legacy fallbacks
    billing_interval: Literal["month", "year"] | None = Field(
        default=None,
        description="Legacy recurring billing interval.",
    )
    interval_count: int | None = Field(default=None, description="Legacy interval count.")


class PriceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, description="A brief name of the price.")
    nickname: str | None = Field(default=None, description="A brief description of the price, hidden from customers.")
    active: bool | None = Field(default=None, description="Whether the price can be used for new purchases.")
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")


class ProductResponse(BaseModel):
    object: Literal["product"] = Field(
        default="product",
        description="String representing the object's type. Always 'product'.",
    )
    id: str = Field(description="Unique identifier for the product.")
    slug: str = Field(description="URL-safe unique identifier for the product.", examples=["876-couriers-free"])
    name: str = Field(description="Human-readable name for the product.", examples=["Free"])
    description: str | None = Field(default=None, description="Human-readable description of the product.")
    app_id: str | None = Field(
        default=None,
        description="ID of the app this product is scoped to. Null for platform-wide products.",
    )
    app_slug: str | None = Field(default=None, description="Slug of the app this product is scoped to.")
    app_name: str | None = Field(default=None, description="Display name of the app this product is scoped to.")
    app_logo_url: str | None = Field(default=None, description="Logo URL of the app this product is scoped to.")
    app_kind: str | None = Field(default=None, description="Kind of app this product is scoped to.")

    status: str = Field(description="Legacy product status.", examples=["active", "archived"])

    active: bool = Field(description="Whether the product is currently available for purchase.")
    statement_descriptor: str | None = Field(
        default=None,
        description="Extra information about a product which will appear on your customer's credit card statement.",
    )
    unit_label: str | None = Field(
        default=None,
        description="A label that represents units of this product in Stripe and on customers’ receipts and invoices.",
    )
    tax_code_id: str | None = Field(
        default=None,
        description="Tax code that classifies this product for tax calculation.",
    )
    lookup_key: str | None = Field(default=None, description="A lookup key used to retrieve products dynamically.")
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
        description="Arbitrary key-value metadata attached to the product.",
    )

    prices: list[PriceResponse] = Field(default_factory=list, description="Prices available on this product.")
    module_ids: list[str] = Field(
        default_factory=list,
        description="Application modules included in this plan.",
    )

    created_at: int = Field(description="Unix timestamp when the product was created.")
    updated_at: int = Field(description="Unix timestamp when the product was last updated.")
    archived_at: int | None = Field(default=None, description="Unix timestamp when the product was archived.")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ProductCreateRequest(BaseModel):
    slug: str = Field(description="URL-safe unique identifier for the product.", examples=["876-couriers-free"])
    name: str = Field(description="Human-readable name for the product.")
    description: str | None = Field(default=None, description="Human-readable description of the product.")
    app_id: str | None = Field(
        default=None, description="ID of the app this product is scoped to. Omit for a platform-wide product."
    )
    lookup_key: str | None = Field(default=None, description="A lookup key used to retrieve products dynamically.")
    tax_code_id: str | None = Field(
        default=None,
        description="Tax code that classifies this product for tax calculation.",
    )
    metadata: dict[str, Any] | None = Field(default=None, description="Arbitrary key-value metadata.")
    module_ids: list[str] = Field(
        default_factory=list,
        description="Application modules to include in the new plan.",
    )
    price: PriceCreateRequest = Field(description="The product's initial price.")


class ProductUpdateRequest(BaseModel):
    slug: str | None = Field(default=None, min_length=1, description="New URL-safe identifier.")
    name: str | None = Field(default=None, description="New display name.")
    description: str | None = Field(default=None, description="New description.")
    active: bool | None = Field(default=None, description="Whether the product is available for purchase.")
    tax_code_id: str | None = Field(
        default=None,
        description="Tax code that classifies this product for tax calculation.",
    )
    metadata: dict[str, Any] | None = Field(default=None, description="New metadata.")


class ProductDeleteResponse(BaseModel):
    object: Literal["product"] = "product"
    id: str
    deleted: bool = True


class ProductModulesReplaceRequest(BaseModel):
    module_ids: list[str] = Field(
        default_factory=list,
        description="Complete set of application modules included in the plan.",
    )
