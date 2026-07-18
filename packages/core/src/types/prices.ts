import * as z from 'zod'
import { Product, productSchema } from './products'

const priceIdSchema = z.string().trim().min(1)
const productIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const priceSchema: z.ZodType<Price> = z.strictObject({
  object: z.literal('price'),
  id: priceIdSchema,
  productId: productIdSchema,
  unitAmount: z.number().int().nullable(),
  currency: z.string(),
  billingInterval: z.enum(['month', 'year']).nullable(),
  intervalCount: z.number().int().nullable(),
  status: z.string(),
  active: z.boolean(),
  lookupKey: z.string().nullable(),
  nickname: z.string().nullable(),
  type: z.string(),
  billingScheme: z.string(),
  tiersMode: z.string().nullable(),
  tiers: z.record(z.string(), z.unknown()).nullable(),
  recurring: z.record(z.string(), z.unknown()).nullable(),
  taxBehavior: z.string().nullable(),
  transformQuantity: z.record(z.string(), z.unknown()).nullable(),
  unitAmountDecimal: z.string().nullable(),
  trialPeriodDays: z.number().int().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  archivedAt: unixTimestampSchema.nullable(),
  product: z.lazy(() => productSchema).nullable(),
  createdAt: unixTimestampSchema,
  updatedAt: unixTimestampSchema,
})

export type Price = {
  object: 'price'
  id: string
  productId: string
  unitAmount: number | null
  currency: string
  billingInterval: 'month' | 'year' | null
  intervalCount: number | null
  status: string
  active: boolean
  lookupKey: string | null
  nickname: string | null
  type: string
  billingScheme: string
  tiersMode: string | null
  tiers: Record<string, unknown> | null
  recurring: Record<string, unknown> | null
  taxBehavior: string | null
  transformQuantity: Record<string, unknown> | null
  unitAmountDecimal: string | null
  trialPeriodDays: number | null
  metadata: Record<string, unknown> | null
  archivedAt: number | null
  product: Product | null
  createdAt: number
}

export type PriceCreateParams = {
  productId: string
  unitAmount?: number | null
  currency: string
  type: string
  billingScheme: string
  nickname?: string | null
  lookupKey?: string | null
  active?: boolean
  metadata?: Record<string, unknown> | null
}

export type PriceUpdateParams = Partial<
  Omit<PriceCreateParams, 'productId' | 'currency' | 'type' | 'billingScheme'>
>

export type PriceListParams = {
  productId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const priceCreateParamsSchema = z.strictObject({
  productId: productIdSchema,
  unitAmount: z.number().int().nullable().optional(),
  currency: z.string().length(3),
  type: z.string(),
  billingScheme: z.string(),
  nickname: z.string().nullable().optional(),
  lookupKey: z.string().nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}) satisfies z.ZodType<PriceCreateParams>

export const priceUpdateParamsSchema = priceCreateParamsSchema.partial().omit({
  productId: true,
  currency: true,
  type: true,
  billingScheme: true,
}) satisfies z.ZodType<PriceUpdateParams>

export const priceListParamsSchema = z.strictObject({
  productId: productIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: priceIdSchema.optional(),
  endingBefore: priceIdSchema.optional(),
}) satisfies z.ZodType<PriceListParams>
