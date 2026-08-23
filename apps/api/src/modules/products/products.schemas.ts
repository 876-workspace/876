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
 * The legacy interval columns and the Stripe-shaped recurring object are both
 * live. The service canonicalizes either representation before persistence.
 */
const amountDecimalSchema = z.string().regex(/^\d+(?:\.\d+)?$/)
const tierSchema = z.strictObject({
  up_to: z.number().int().nullable(),
  unit_amount: z.number().int().min(0).nullable().optional(),
  unit_amount_decimal: amountDecimalSchema.nullable().optional(),
  flat_amount: z.number().int().min(0).nullable().optional(),
  flat_amount_decimal: amountDecimalSchema.nullable().optional(),
})
const recurringSchema = z.strictObject({
  interval: z.enum(['month', 'year']),
  interval_count: z.number().int().min(1).default(1),
  usage_type: z.enum(['licensed', 'metered']).default('licensed'),
  meter_id: z.string().nullable().optional(),
  trial_period_days: z.number().int().min(0).nullable().optional(),
})
const transformQuantitySchema = z.strictObject({
  divide_by: z.number().int().min(1),
  round: z.enum(['up', 'down']),
})

const priceFieldsSchema = z.strictObject({
  unit_amount: z.number().int().nullable().optional(),
  unit_amount_decimal: amountDecimalSchema.nullable().optional(),
  currency: z.string().max(3).default('jmd'),
  recurring: recurringSchema.nullable().optional(),
  lookup_key: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  type: z.enum(['one_time', 'recurring']).default('recurring'),
  billing_scheme: z.enum(['per_unit', 'tiered']).default('per_unit'),
  tiers_mode: z.enum(['graduated', 'volume']).nullable().optional(),
  tiers: z.array(tierSchema).nullable().optional(),
  tax_behavior: z
    .enum(['inclusive', 'exclusive', 'unspecified'])
    .nullable()
    .optional(),
  transform_quantity: transformQuantitySchema.nullable().optional(),
  trial_period_days: z.number().int().min(0).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  billing_interval: z.enum(['month', 'year']).nullable().optional(),
  interval_count: z.number().int().nullable().optional(),
})

function addIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  code: string
) {
  ctx.addIssue({ code: 'custom', path, message: code })
}

function validatePriceFields(
  value: z.infer<typeof priceFieldsSchema>,
  ctx: z.RefinementCtx
) {
  const perUnit = value.billing_scheme === 'per_unit'
  const amountCount =
    Number(value.unit_amount !== undefined && value.unit_amount !== null) +
    Number(
      value.unit_amount_decimal !== undefined &&
        value.unit_amount_decimal !== null
    )
  // At most one, deliberately not exactly one. An absent amount has always
  // been accepted and writes a null-amount price, which is how a free price is
  // expressed; requiring an amount here would 422 every existing caller. Both
  // set at once is a genuine contradiction and stays rejected.
  if (perUnit && amountCount > 1)
    addIssue(ctx, ['unit_amount'], 'price/invalid-unit-amount')
  if (!perUnit && amountCount !== 0)
    addIssue(ctx, ['unit_amount'], 'price/tiered-forbids-unit-amount')
  if (!perUnit && (!value.tiers?.length || !value.tiers_mode))
    addIssue(ctx, ['tiers'], 'price/tiered-requires-tiers')
  if (
    perUnit &&
    ((value.tiers !== undefined && value.tiers !== null) ||
      (value.tiers_mode !== undefined && value.tiers_mode !== null))
  )
    addIssue(ctx, ['tiers'], 'price/per-unit-forbids-tiers')
  if (value.tiers) {
    const open = value.tiers
      .map((tier, index) => (tier.up_to === null ? index : -1))
      .filter((index) => index >= 0)
    if (open.length !== 1 || open[0] !== value.tiers.length - 1)
      addIssue(ctx, ['tiers'], 'price/invalid-tier-boundaries')
    const closed = value.tiers
      .filter((tier) => tier.up_to !== null)
      .map((tier) => tier.up_to as number)
    if (closed.some((upTo, index) => index > 0 && upTo <= closed[index - 1]!))
      addIssue(ctx, ['tiers'], 'price/invalid-tier-order')
  }
  if (
    value.type === 'one_time' &&
    ((value.recurring !== undefined && value.recurring !== null) ||
      (value.billing_interval !== undefined &&
        value.billing_interval !== null) ||
      (value.interval_count !== undefined && value.interval_count !== null) ||
      (value.trial_period_days !== undefined &&
        value.trial_period_days !== null))
  )
    addIssue(ctx, ['type'], 'price/one-time-forbids-recurring')
  // A recurring price with no interval at all stays valid: `billing_interval`
  // is a nullable column and callers have always been able to omit it. The
  // richer path is still guarded, because `recurring.interval` is required by
  // the object's own schema whenever `recurring` is supplied.
  if (
    value.recurring?.usage_type === 'metered' &&
    value.transform_quantity !== undefined &&
    value.transform_quantity !== null
  )
    addIssue(
      ctx,
      ['transform_quantity'],
      'price/metered-forbids-transform-quantity'
    )
}

export const priceCreateBodySchema =
  priceFieldsSchema.superRefine(validatePriceFields)

export const updatePriceBodySchema = priceFieldsSchema.partial().extend({
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
