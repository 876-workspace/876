/**
 * OpenAPI prose for the Products module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_PRODUCTS_SUMMARY = 'List products'

export const LIST_PRODUCTS_DESCRIPTION = `
Returns the catalog of subscribable products (with their prices), optionally
filtered by app.

Products scoped to a specific app (\`app_id\` set) are only relevant to that
app; products with a null \`app_id\` are platform-wide and reusable across apps.
`

export const LIST_PRODUCTS_RESPONSES = {} as const

export const CREATE_PRODUCT_SUMMARY = 'Create a product'

export const CREATE_PRODUCT_DESCRIPTION =
  'Adds a product with its initial price to the catalog. **Admin only**.'

export const CREATE_PRODUCT_RESPONSES = {} as const

export const REPLACE_PRODUCT_MODULES_SUMMARY = 'Replace plan modules'

export const REPLACE_PRODUCT_MODULES_DESCRIPTION = `Replaces the durable application modules included in a plan. Every module must belong to the same app as the plan. An optional feature flag remains the module's operational rollout or kill switch. **Admin only**.`

export const REPLACE_PRODUCT_MODULES_RESPONSES = {} as const

export const UPDATE_PRODUCT_SUMMARY = 'Update a product'

export const UPDATE_PRODUCT_DESCRIPTION = `Updates a product's slug, display fields, or active state. Slugs are mutable because relationships reference the product ID; uniqueness is still enforced. Price changes go through the prices endpoints, not this one. **Admin only**.`

export const UPDATE_PRODUCT_RESPONSES = {} as const

export const ARCHIVE_PRODUCT_SUMMARY = 'Archive a product'

export const ARCHIVE_PRODUCT_DESCRIPTION = `Sets a product's status to \`archived\` rather than deleting it, so organizations already subscribed to one of its prices keep their subscription item. Archived products are excluded from default-price resolution. **Admin only**.`

export const ARCHIVE_PRODUCT_RESPONSES = {} as const

export const CREATE_PRICE_SUMMARY = 'Create a price'

export const CREATE_PRICE_DESCRIPTION =
  'Adds an additional price to an existing product (e.g. an annual option). **Admin only**.'

export const CREATE_PRICE_RESPONSES = {} as const

export const RETRIEVE_PRICE_SUMMARY = 'Retrieve a price'

export const RETRIEVE_PRICE_DESCRIPTION = 'Retrieves a price. **Admin only**.'

export const RETRIEVE_PRICE_RESPONSES = {} as const

export const UPDATE_PRICE_SUMMARY = 'Update a price'

export const UPDATE_PRICE_DESCRIPTION = 'Updates a price. **Admin only**.'

export const UPDATE_PRICE_RESPONSES = {} as const

export const ARCHIVE_PRICE_SUMMARY = 'Archive a price'

export const ARCHIVE_PRICE_DESCRIPTION = `Sets a price's active status to false. **Admin only**.`

export const ARCHIVE_PRICE_RESPONSES = {} as const
