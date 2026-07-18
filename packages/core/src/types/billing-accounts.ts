import * as z from 'zod'
import { Subscription, subscriptionSchema } from './subscriptions'

const billingAccountIdSchema = z.string().trim().min(1)
const organizationIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const billingAccountSchema: z.ZodType<BillingAccount> = z.strictObject({
  object: z.literal('billing_account'),
  id: billingAccountIdSchema,
  organizationId: organizationIdSchema,
  name: z.string().nullable(),
  email: z.string().nullable(),
  invoiceEmail: z.string().nullable(),
  currency: z.string().nullable(),
  taxExempt: z.string().nullable(),
  balance: z.number().int(),
  defaultPaymentMethodId: z.string().nullable(),
  invoiceSettings: z.record(z.string(), z.unknown()).nullable(),
  preferredLocales: z.record(z.string(), z.unknown()).nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  shipping: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  subscriptions: z.lazy(() => z.array(subscriptionSchema)).nullable(),
  createdAt: unixTimestampSchema,
  updatedAt: unixTimestampSchema,
})

export type BillingAccount = {
  object: 'billing_account'
  id: string
  organizationId: string
  name: string | null
  email: string | null
  invoiceEmail: string | null
  currency: string | null
  taxExempt: string | null
  balance: number
  defaultPaymentMethodId: string | null
  invoiceSettings: Record<string, unknown> | null
  preferredLocales: Record<string, unknown> | null
  address: Record<string, unknown> | null
  shipping: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  subscriptions: Subscription[] | null
  createdAt: number
  updatedAt: number
}

export type BillingAccountCreateParams = {
  organizationId: string
  name?: string | null
  email?: string | null
  invoiceEmail?: string | null
  currency?: string | null
  taxExempt?: string | null
  balance?: number
  defaultPaymentMethodId?: string | null
  invoiceSettings?: Record<string, unknown> | null
  preferredLocales?: Record<string, unknown> | null
  address?: Record<string, unknown> | null
  shipping?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export type BillingAccountUpdateParams = Partial<
  Omit<BillingAccountCreateParams, 'organizationId'>
>

export type BillingAccountListParams = {
  organizationId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type BillingAccountSearchParams = {
  query: string
  limit?: number
}

export const billingAccountCreateParamsSchema = z.strictObject({
  organizationId: organizationIdSchema,
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  invoiceEmail: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  taxExempt: z.string().nullable().optional(),
  balance: z.number().int().optional(),
  defaultPaymentMethodId: z.string().nullable().optional(),
  invoiceSettings: z.record(z.string(), z.unknown()).nullable().optional(),
  preferredLocales: z.record(z.string(), z.unknown()).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  shipping: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}) satisfies z.ZodType<BillingAccountCreateParams>

export const billingAccountUpdateParamsSchema = billingAccountCreateParamsSchema
  .partial()
  .omit({
    organizationId: true,
  }) satisfies z.ZodType<BillingAccountUpdateParams>

export const billingAccountListParamsSchema = z.strictObject({
  organizationId: organizationIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: billingAccountIdSchema.optional(),
  endingBefore: billingAccountIdSchema.optional(),
}) satisfies z.ZodType<BillingAccountListParams>

export const billingAccountSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
}) satisfies z.ZodType<BillingAccountSearchParams>
