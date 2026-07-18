import * as z from 'zod'
import { Price, priceSchema } from './prices'

const subscriptionItemIdSchema = z.string().trim().min(1)
const subscriptionIdSchema = z.string().trim().min(1)
const priceIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const subscriptionItemSchema: z.ZodType<SubscriptionItem> =
  z.strictObject({
    object: z.literal('subscription_item'),
    id: subscriptionItemIdSchema,
    subscriptionId: subscriptionIdSchema,
    priceId: priceIdSchema,
    quantity: z.number().int().nullable(),
    billingThresholds: z.record(z.string(), z.unknown()).nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    price: z.lazy(() => priceSchema).nullable(),
    createdAt: unixTimestampSchema,
    updatedAt: unixTimestampSchema,
  })

export type SubscriptionItem = {
  object: 'subscription_item'
  id: string
  subscriptionId: string
  priceId: string
  quantity: number | null
  billingThresholds: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  price: Price | null
  createdAt: number
}

export type SubscriptionItemCreateParams = {
  subscriptionId: string
  priceId: string
  quantity?: number | null
  metadata?: Record<string, unknown> | null
}

export type SubscriptionItemUpdateParams = Partial<
  Omit<SubscriptionItemCreateParams, 'subscriptionId' | 'priceId'>
>

export type SubscriptionItemListParams = {
  subscriptionId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const subscriptionItemCreateParamsSchema = z.strictObject({
  subscriptionId: subscriptionIdSchema,
  priceId: priceIdSchema,
  quantity: z.number().int().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}) satisfies z.ZodType<SubscriptionItemCreateParams>

export const subscriptionItemUpdateParamsSchema =
  subscriptionItemCreateParamsSchema.partial().omit({
    subscriptionId: true,
    priceId: true,
  }) satisfies z.ZodType<SubscriptionItemUpdateParams>

export const subscriptionItemListParamsSchema = z.strictObject({
  subscriptionId: subscriptionIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: subscriptionItemIdSchema.optional(),
  endingBefore: subscriptionItemIdSchema.optional(),
}) satisfies z.ZodType<SubscriptionItemListParams>
