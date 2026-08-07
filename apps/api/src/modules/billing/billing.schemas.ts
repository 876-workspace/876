import { z } from 'zod'

// The subscription contract belongs to the organizations module — `billing`
// consumes it rather than declaring a second one, exactly as
// `domains/billing/router.py` imports `SubscriptionResponse` from
// `domains.organizations.schemas`.
import {
  subscriptionItemSchema,
  subscriptionSchema,
  type Subscription,
} from '@/modules/organizations'

export { subscriptionItemSchema, subscriptionSchema, type Subscription }

const metadataSchema = z.record(z.string(), z.unknown()).nullable()

export const billingAccountSchema = z
  .object({
    object: z
      .literal('billing_account')
      .meta({ description: "Always 'billing_account'." }),
    id: z.string(),
    organization_id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    invoice_email: z.string().nullable(),
    currency: z.string().nullable(),
    tax_exempt: z.string().nullable(),
    balance: z.number().int(),
    default_payment_method_id: z.string().nullable(),
    invoice_settings: z.record(z.string(), z.unknown()).nullable(),
    preferred_locales: z.record(z.string(), z.unknown()).nullable(),
    address: z.record(z.string(), z.unknown()).nullable(),
    shipping: z.record(z.string(), z.unknown()).nullable(),
    metadata: metadataSchema,
    subscriptions: z.array(z.unknown()).nullable().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'BillingAccount' })

export const billingCustomerSyncDispatchSchema = z
  .object({
    object: z.literal('billing_customer_sync_dispatch'),
    claimed: z.number().int(),
    delivered: z.number().int(),
    failed: z.number().int(),
    configured: z.boolean(),
  })
  .meta({ id: 'BillingCustomerSyncDispatch' })

export const billingCustomerSyncReconcileSchema = z
  .object({
    object: z.literal('billing_customer_sync_reconcile'),
    organizations: z.number().int(),
    users: z.number().int(),
  })
  .meta({ id: 'BillingCustomerSyncReconcile' })

export const financeProvisioningReconcileSchema = z
  .object({
    object: z.literal('finance_provisioning_reconciliation'),
    scanned: z.number().int(),
    enqueued: z.number().int(),
    next_cursor: z.string().nullable(),
  })
  .meta({ id: 'FinanceProvisioningReconciliation' })

export const financeProvisioningDispatchSchema = z
  .object({
    object: z.literal('finance_provisioning_dispatch'),
    claimed: z.number().int(),
    delivered: z.number().int(),
    failed: z.number().int(),
    configured: z.boolean(),
  })
  .meta({ id: 'FinanceProvisioningDispatch' })

// Request bodies
export const billingAccountCreateSchema = z.strictObject({
  organization_id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  invoice_email: z.string().nullable().optional(),
  currency: z.string().default('JMD'),
  tax_exempt: z.string().nullable().optional(),
  invoice_settings: z.record(z.string(), z.unknown()).nullable().optional(),
  preferred_locales: z.record(z.string(), z.unknown()).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  shipping: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const billingAccountUpdateSchema = z.strictObject({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  invoice_email: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  tax_exempt: z.string().nullable().optional(),
  default_payment_method_id: z.string().nullable().optional(),
  invoice_settings: z.record(z.string(), z.unknown()).nullable().optional(),
  preferred_locales: z.record(z.string(), z.unknown()).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  shipping: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const subscriptionCreateSchema = z.strictObject({
  organization_id: z.string(),
  app_id: z.string(),
  price_id: z.string().nullable().optional(),
  billing_account_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  collection_method: z.string().nullable().optional(),
  cancel_at_period_end: z.boolean().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const subscriptionUpdateSchema = z.strictObject({
  billing_account_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  collection_method: z.string().nullable().optional(),
  cancel_at_period_end: z.boolean().nullable().optional(),
  price_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const subscriptionItemCreateSchema = z.strictObject({
  price_id: z.string(),
  quantity: z.number().int().default(1),
})

export const subscriptionItemUpdateSchema = z.strictObject({
  quantity: z.number().int().nullable().optional(),
  price_id: z.string().nullable().optional(),
})

export const financeProvisioningReconcileRequestSchema = z.strictObject({
  app_id: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
  starting_after: z.string().nullable().optional(),
})

// Params & queries
export const billingAccountIdParamsSchema = z.strictObject({
  account_id: z.string(),
})
export const subscriptionIdParamsSchema = z.strictObject({
  subscription_id: z.string(),
})
export const subscriptionItemParamsSchema = z.strictObject({
  subscription_id: z.string(),
  item_id: z.string(),
})

export const listBillingAccountsQuerySchema = z.object({
  organization_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const listSubscriptionsQuerySchema = z.object({
  organization_id: z.string().optional(),
  app_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type BillingAccount = z.infer<typeof billingAccountSchema>
export type BillingAccountCreate = z.infer<typeof billingAccountCreateSchema>
export type BillingAccountUpdate = z.infer<typeof billingAccountUpdateSchema>
export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>
export type SubscriptionItemCreate = z.infer<
  typeof subscriptionItemCreateSchema
>
export type SubscriptionItemUpdate = z.infer<
  typeof subscriptionItemUpdateSchema
>
export type FinanceProvisioningReconcileRequest = z.infer<
  typeof financeProvisioningReconcileRequestSchema
>
