import * as z from 'zod'
import { SubscriptionItem, subscriptionItemSchema } from './subscription-items'

const subscriptionIdSchema = z.string().trim().min(1)
const billingAccountIdSchema = z.string().trim().min(1)
const organizationIdSchema = z.string().trim().min(1)
const appIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const subscriptionSchema: z.ZodType<Subscription> = z.strictObject({
  object: z.literal('subscription'),
  id: subscriptionIdSchema,
  billingAccountId: billingAccountIdSchema.nullable(),
  organizationId: organizationIdSchema,
  appId: appIdSchema,
  status: z.string(),
  providerStatus: z.string().nullable(),
  statusReason: z.string().nullable(),
  financeLifecycleVersion: z.number().int().nonnegative(),
  active: z.boolean(),
  collectionMethod: z.string().nullable(),
  billingCycleAnchor: unixTimestampSchema.nullable(),
  cancelAt: unixTimestampSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: unixTimestampSchema.nullable(),
  endedAt: unixTimestampSchema.nullable(),
  pauseCollection: z.record(z.string(), z.unknown()).nullable(),
  trialStart: unixTimestampSchema.nullable(),
  trialEnd: unixTimestampSchema.nullable(),
  startDate: unixTimestampSchema.nullable(),
  defaultPaymentMethodId: z.string().nullable(),
  latestInvoiceId: z.string().nullable(),
  pendingUpdate: z.record(z.string(), z.unknown()).nullable(),
  scheduleId: z.string().nullable(),
  items: z.lazy(() => z.array(subscriptionItemSchema)),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: unixTimestampSchema,
  updatedAt: unixTimestampSchema,
})

export type Subscription = {
  object: 'subscription'
  id: string
  billingAccountId: string | null
  organizationId: string
  appId: string
  status: string
  providerStatus: string | null
  statusReason: string | null
  financeLifecycleVersion: number
  active: boolean
  collectionMethod: string | null
  billingCycleAnchor: number | null
  cancelAt: number | null
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  endedAt: number | null
  pauseCollection: Record<string, unknown> | null
  trialStart: number | null
  trialEnd: number | null
  startDate: number | null
  defaultPaymentMethodId: string | null
  latestInvoiceId: string | null
  pendingUpdate: Record<string, unknown> | null
  scheduleId: string | null
  items: SubscriptionItem[]
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export type SubscriptionCreateParams = {
  billingAccountId?: string | null
  organizationId: string
  appId: string
  status?: string
  collectionMethod?: string | null
  cancelAtPeriodEnd?: boolean
  metadata?: Record<string, unknown> | null
}

export type SubscriptionUpdateParams = Partial<
  Omit<SubscriptionCreateParams, 'organizationId' | 'appId'>
>

export type SubscriptionListParams = {
  organizationId?: string
  billingAccountId?: string
  appId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type SubscriptionSearchParams = {
  query: string
  limit?: number
}

export const subscriptionCreateParamsSchema = z.strictObject({
  billingAccountId: billingAccountIdSchema.nullable().optional(),
  organizationId: organizationIdSchema,
  appId: appIdSchema,
  status: z.string().optional(),
  collectionMethod: z.string().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}) satisfies z.ZodType<SubscriptionCreateParams>

export const subscriptionUpdateParamsSchema = subscriptionCreateParamsSchema
  .partial()
  .omit({
    organizationId: true,
    appId: true,
  }) satisfies z.ZodType<SubscriptionUpdateParams>

export const subscriptionListParamsSchema = z.strictObject({
  organizationId: organizationIdSchema.optional(),
  billingAccountId: billingAccountIdSchema.optional(),
  appId: appIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: subscriptionIdSchema.optional(),
  endingBefore: subscriptionIdSchema.optional(),
}) satisfies z.ZodType<SubscriptionListParams>

export const subscriptionSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
}) satisfies z.ZodType<SubscriptionSearchParams>
