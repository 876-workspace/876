import * as z from 'zod'

const billingProviderObjectIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const billingProviderObjectSchema = z.strictObject({
  object: z.literal('billing_provider_object'),
  id: billingProviderObjectIdSchema,
  provider: z.string(),
  providerObjectType: z.string(),
  providerObjectId: z.string(),
  internalObjectType: z.string(),
  internalObjectId: z.string(),
  livemode: z.boolean(),
  syncedAt: unixTimestampSchema.nullable(),
  rawPayload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: unixTimestampSchema,
  updatedAt: unixTimestampSchema,
})

export type BillingProviderObject = {
  object: 'billing_provider_object'
  id: string
  provider: string
  providerObjectType: string
  providerObjectId: string
  internalObjectType: string
  internalObjectId: string
  livemode: boolean
  syncedAt: number | null
  rawPayload: Record<string, unknown> | null
  createdAt: number
}

export type BillingProviderObjectListParams = {
  internalObjectId?: string
  internalObjectType?: string
  providerObjectId?: string
  providerObjectType?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const billingProviderObjectListParamsSchema = z.strictObject({
  internalObjectId: z.string().optional(),
  internalObjectType: z.string().optional(),
  providerObjectId: z.string().optional(),
  providerObjectType: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: billingProviderObjectIdSchema.optional(),
  endingBefore: billingProviderObjectIdSchema.optional(),
}) satisfies z.ZodType<BillingProviderObjectListParams>
