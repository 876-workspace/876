"""Rich Swagger descriptions and response maps for the Products domain."""

from __future__ import annotations

LIST_PRODUCTS_SUMMARY = "List products"
LIST_PRODUCTS_DESCRIPTION = """
Returns the catalog of subscribable products (with their prices), optionally
filtered by app.

Products scoped to a specific app (`app_id` set) are only relevant to that
app; products with a null `app_id` are platform-wide and reusable across apps.
"""
LIST_PRODUCTS_RESPONSES: dict = {}

CREATE_PRODUCT_SUMMARY = "Create a product"
CREATE_PRODUCT_DESCRIPTION = "Adds a product with its initial price to the catalog. **Admin only**."
CREATE_PRODUCT_RESPONSES: dict = {}

REPLACE_PRODUCT_MODULES_SUMMARY = "Replace plan modules"
REPLACE_PRODUCT_MODULES_DESCRIPTION = (
    "Replaces the durable application modules included in a plan. Every module "
    "must belong to the same app as the plan. An optional feature flag remains "
    "the module's operational rollout or kill switch. "
    "**Admin only**."
)
REPLACE_PRODUCT_MODULES_RESPONSES: dict = {}

UPDATE_PRODUCT_SUMMARY = "Update a product"
UPDATE_PRODUCT_DESCRIPTION = (
    "Updates a product's slug, display fields, or active state. Slugs are mutable because relationships "
    "reference the product ID; uniqueness is still enforced. "
    "Price changes go through the prices endpoints, not this one. **Admin only**."
)
UPDATE_PRODUCT_RESPONSES: dict = {}

ARCHIVE_PRODUCT_SUMMARY = "Archive a product"
ARCHIVE_PRODUCT_DESCRIPTION = (
    "Sets a product's status to `archived` rather than deleting it, so organizations already subscribed "
    "to one of its prices keep their subscription item. Archived products are excluded from "
    "default-price resolution. **Admin only**."
)
ARCHIVE_PRODUCT_RESPONSES: dict = {}

CREATE_PRICE_SUMMARY = "Create a price"
CREATE_PRICE_DESCRIPTION = "Adds an additional price to an existing product (e.g. an annual option). **Admin only**."
CREATE_PRICE_RESPONSES: dict = {}

RETRIEVE_PRICE_SUMMARY = "Retrieve a price"
RETRIEVE_PRICE_DESCRIPTION = "Retrieves a price. **Admin only**."
RETRIEVE_PRICE_RESPONSES: dict = {}

UPDATE_PRICE_SUMMARY = "Update a price"
UPDATE_PRICE_DESCRIPTION = "Updates a price. **Admin only**."
UPDATE_PRICE_RESPONSES: dict = {}

ARCHIVE_PRICE_SUMMARY = "Archive a price"
ARCHIVE_PRICE_DESCRIPTION = "Sets a price's active status to false. **Admin only**."
ARCHIVE_PRICE_RESPONSES: dict = {}
