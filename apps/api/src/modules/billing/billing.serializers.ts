import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type { BillingAccount, Subscription } from './billing.schemas'

export type BillingAccountRow = {
  id: string
  organizationId: string
  name: string | null
  email: string | null
  invoiceEmail: string | null
  currency: string | null
  taxExempt: string | null
  balance: bigint
  defaultPaymentMethodId: string | null
  invoiceSettings: unknown
  preferredLocales: unknown
  address: unknown
  shipping: unknown
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
}

export type SubscriptionItemRow = {
  id: string
  subscriptionId: string
  priceId: string
  quantity: number
  price?: {
    id: string
    productId: string | null
    product?: { id: string; slug: string; name: string } | null
  } | null
}

// The subscription row shape is owned by the organizations module alongside
// the contract it serializes to.
export type { SubscriptionRow } from '@/modules/organizations'

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>
  return null
}

export function serializeBillingAccount(
  row: BillingAccountRow
): BillingAccount {
  return {
    object: 'billing_account',
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    email: row.email,
    invoice_email: row.invoiceEmail,
    currency: row.currency,
    tax_exempt: row.taxExempt,
    // `balance` is a BigInt column; one reaching JSON.stringify throws.
    balance: Number(row.balance),
    default_payment_method_id: row.defaultPaymentMethodId,
    invoice_settings: toRecord(row.invoiceSettings),
    preferred_locales: toRecord(row.preferredLocales),
    address: toRecord(row.address),
    shipping: toRecord(row.shipping),
    metadata: toRecord(row.metadata),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

// `serializeSubscription` is re-exported from the organizations module rather
// than duplicated here — `domains/billing/router.py` imports
// `_serialize_subscription` from the organizations router for the same reason.
export { serializeSubscription } from '@/modules/organizations'

export function serializeSubscriptionItem(
  row: SubscriptionItemRow & {
    price?: {
      product?: { id: string; slug: string; name: string } | null
      productId?: string | null
    } | null
  }
) {
  return {
    object: 'subscription_item' as const,
    id: row.id,
    price_id: row.priceId,
    product_id:
      row.price?.product?.id ??
      (row.price as { productId?: string | null })?.productId ??
      null,
    product_slug: row.price?.product?.slug ?? null,
    product_name: row.price?.product?.name ?? null,
    quantity: row.quantity,
  }
}
