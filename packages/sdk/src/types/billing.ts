import * as z from 'zod'
import type { Result } from './api.ts'

export const sdk876SubscriptionItemSchema = z.object({
  object: z.literal('subscription_item'),
  id: z.string(),
  price_id: z.string(),
  product_id: z.string().nullable(),
  product_slug: z.string().nullable(),
  product_name: z.string().nullable(),
  quantity: z.number(),
  billing_thresholds: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export const sdk876SubscriptionSchema = z.object({
  object: z.literal('subscription'),
  id: z.string(),
  billing_account_id: z.string().nullable(),
  organization_id: z.string(),
  app_id: z.string(),
  app_slug: z.string().nullable(),
  app_name: z.string().nullable(),
  app_logo_url: z.string().nullable(),
  app_kind: z.string().nullable(),
  status: z.string(),
  provider_status: z.string().nullable(),
  status_reason: z.string().nullable(),
  finance_lifecycle_version: z.number().int().nonnegative(),
  collection_method: z.string(),
  billing_cycle_anchor: z.number().nullable(),

  items: z.array(sdk876SubscriptionItemSchema),

  current_period_start: z.number().nullable(),
  current_period_end: z.number().nullable(),
  cancel_at: z.number().nullable(),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.number().nullable(),
  ended_at: z.number().nullable(),

  pause_collection: z.record(z.string(), z.unknown()).nullable(),
  trial_start: z.number().nullable(),
  trial_end: z.number().nullable(),
  start_date: z.number().nullable(),

  default_payment_method_id: z.string().nullable(),
  latest_invoice_id: z.string().nullable(),
  pending_update: z.record(z.string(), z.unknown()).nullable(),
  schedule_id: z.string().nullable(),

  metadata: z.record(z.string(), z.unknown()).nullable(),

  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876BillingAccountSchema = z.object({
  object: z.literal('billing_account'),
  id: z.string(),
  organization_id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  invoice_email: z.string().nullable(),
  currency: z.string().nullable(),
  tax_exempt: z.string().nullable(),
  balance: z.number(),
  default_payment_method_id: z.string().nullable(),

  invoice_settings: z.record(z.string(), z.unknown()).nullable(),
  preferred_locales: z.record(z.string(), z.unknown()).nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  shipping: z.record(z.string(), z.unknown()).nullable(),

  metadata: z.record(z.string(), z.unknown()).nullable(),

  subscriptions: z.array(sdk876SubscriptionSchema).nullable(),

  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876SubscriptionListSchema = z.object({
  object: z.literal('list'),
  data: z.array(sdk876SubscriptionSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

export const sdk876BillingAccountListSchema = z.object({
  object: z.literal('list'),
  data: z.array(sdk876BillingAccountSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

export type SubscriptionItem = z.infer<typeof sdk876SubscriptionItemSchema>
export type Subscription = z.infer<typeof sdk876SubscriptionSchema>
export type SubscriptionList = z.infer<typeof sdk876SubscriptionListSchema>
export type BillingAccount = z.infer<typeof sdk876BillingAccountSchema>
export type BillingAccountList = z.infer<typeof sdk876BillingAccountListSchema>

export type SubscriptionResult = Result<Subscription>
export type SubscriptionListResult = Result<SubscriptionList>
export type BillingAccountResult = Result<BillingAccount>
export type BillingAccountListResult = Result<BillingAccountList>
