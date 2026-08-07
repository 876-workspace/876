import { z } from 'zod'

/**
 * The subscribable product catalog and its prices.
 *
 * A product is a plan an organization subscribes to; a price is one way to pay
 * for it. The `billing_interval` / `interval_count` / `status` trio on a price
 * predates the Stripe-shaped fields beside it and is still written, so both
 * sets are serialized rather than one being dropped.
 */

const metadataSchema = z.record(z.string(), z.unknown()).nullable()

export const priceSchema = z
  .object({
    object: z.literal('price').meta({ description: "Always 'price'." }),
    id: z.string(),
    product_id: z.string(),

    billing_interval: z.string().nullable(),
    interval_count: z.number().int().nullable(),
    status: z.string(),

    unit_amount: z.number().int().nullable(),
    unit_amount_decimal: z.string().nullable(),
    currency: z.string(),
    lookup_key: z.string().nullable(),
    name: z.string().nullable(),
    nickname: z.string().nullable(),
    type: z.string(),
    billing_scheme: z.string(),
    tiers_mode: z.string().nullable(),
    tiers: z.array(z.record(z.string(), z.unknown())).nullable(),
    recurring: z.record(z.string(), z.unknown()).nullable(),
    tax_behavior: z.string().nullable(),
    transform_quantity: z.record(z.string(), z.unknown()).nullable(),
    trial_period_days: z.number().int().nullable(),
    active: z.boolean(),
    metadata: metadataSchema,

    created_at: z.number().int(),
    updated_at: z.number().int(),
    archived_at: z.number().int().nullable(),
  })
  .meta({ id: 'Price' })

export const productSchema = z
  .object({
    object: z.literal('product').meta({ description: "Always 'product'." }),
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    app_id: z.string().nullable(),
    app_slug: z.string().nullable(),
    app_name: z.string().nullable(),
    app_logo_url: z.string().nullable(),
    app_kind: z.string().nullable(),

    status: z.string(),
    active: z.boolean(),
    statement_descriptor: z.string().nullable(),
    unit_label: z.string().nullable(),
    tax_code_id: z.string().nullable(),
    lookup_key: z.string().nullable(),
    metadata: metadataSchema,

    prices: z.array(priceSchema),
    module_ids: z.array(z.string()),

    created_at: z.number().int(),
    updated_at: z.number().int(),
    archived_at: z.number().int().nullable(),
  })
  .meta({ id: 'Product' })

/**
 * The initial price carried on a product create, and the body of a standalone
 * price create.
 *
 * `recurring`, `lookup_key`, `metadata`, and `type` are accepted and not yet
 * persisted — the FastAPI service takes the same fields and writes only the
 * subset below, so rejecting them here would break callers that already send
 * them.
 */
export const priceCreateBodySchema = z.strictObject({
  unit_amount: z.number().int().nullable().optional(),
  currency: z.string().max(3).default('jmd'),
  recurring: z.record(z.string(), z.unknown()).nullable().optional(),
  lookup_key: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  type: z.enum(['one_time', 'recurring']).default('recurring'),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  billing_interval: z.enum(['month', 'year']).nullable().optional(),
  interval_count: z.number().int().nullable().optional(),
})

export const updatePriceBodySchema = z.strictObject({
  name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const createProductBodySchema = z.strictObject({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  app_id: z.string().nullable().optional(),
  lookup_key: z.string().nullable().optional(),
  tax_code_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  module_ids: z.array(z.string()).default([]),
  price: priceCreateBodySchema,
})

/**
 * `slug`, `name`, and `active` are not nullable here although the Pydantic
 * model admits `None` for each. All three back NOT NULL columns: a null slug
 * reaches `.strip()` and raises, and a null `name` or `active` reaches the
 * database and fails the constraint. Accepting them would only reproduce a
 * 500, so they are rejected as a 422 instead. `description`, `tax_code_id`,
 * and `metadata` stay nullable, because clearing those is a real operation.
 */
export const updateProductBodySchema = z.strictObject({
  slug: z.string().min(1).optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  tax_code_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const replaceProductModulesBodySchema = z.strictObject({
  module_ids: z.array(z.string()).default([]),
})

export const listProductsQuerySchema = z.object({
  appId: z.string().optional(),
  status: z.string().optional(),
})

export const productIdParamsSchema = z.strictObject({ product_id: z.string() })

export const priceParamsSchema = z.strictObject({
  product_id: z.string(),
  price_id: z.string(),
})

export type Price = z.infer<typeof priceSchema>
export type Product = z.infer<typeof productSchema>
export type PriceCreateBody = z.infer<typeof priceCreateBodySchema>
export type UpdatePriceBody = z.infer<typeof updatePriceBodySchema>
export type CreateProductBody = z.infer<typeof createProductBodySchema>
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>
export type ReplaceProductModulesBody = z.infer<
  typeof replaceProductModulesBodySchema
>
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
