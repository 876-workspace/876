/** Row → API resource for products and prices. */

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type { Price, Product } from './products.schemas'

export type PriceRow = {
  id: string
  productId: string
  billingInterval: string | null
  intervalCount: number | null
  status: string
  unitAmount: bigint | null
  unitAmountDecimal: string | null
  currency: string
  lookupKey: string | null
  name: string | null
  nickname: string | null
  type: string
  billingScheme: string
  tiersMode: string | null
  tiers: unknown
  recurring: unknown
  taxBehavior: string | null
  transformQuantity: unknown
  trialPeriodDays: number | null
  active: boolean
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
  archivedAt: bigint | null
}

export type ProductRow = {
  id: string
  slug: string
  name: string
  description: string | null
  appId: string | null
  status: string
  active: boolean
  statementDescriptor: string | null
  unitLabel: string | null
  taxCodeId: string | null
  lookupKey: string | null
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
  archivedAt: bigint | null
  app: {
    slug: string
    name: string
    logoUrl: string | null
    appKind: string
  } | null
  prices: PriceRow[]
  planModules: { moduleId: string }[]
}

/**
 * A `Json` column degrades to null rather than breaking the response.
 *
 * These columns are written by more than one service and one malformed row
 * should cost that row its metadata, not the whole list a Console page is
 * rendering.
 */
function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asObjectArray(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value)) return null

  const entries = value.map(asObject)
  return entries.every((entry) => entry !== null)
    ? (entries as Record<string, unknown>[])
    : null
}

export function serializePrice(row: PriceRow): Price {
  return {
    object: 'price',
    id: row.id,
    product_id: row.productId,
    billing_interval: row.billingInterval,
    interval_count: row.intervalCount,
    status: row.status,
    unit_amount: row.unitAmount === null ? null : Number(row.unitAmount),
    unit_amount_decimal: row.unitAmountDecimal,
    currency: row.currency,
    lookup_key: row.lookupKey,
    name: row.name,
    nickname: row.nickname,
    type: row.type,
    billing_scheme: row.billingScheme,
    tiers_mode: row.tiersMode,
    tiers: asObjectArray(row.tiers),
    recurring: asObject(row.recurring),
    tax_behavior: row.taxBehavior,
    transform_quantity: asObject(row.transformQuantity),
    trial_period_days: row.trialPeriodDays,
    active: row.active,
    metadata: asObject(row.metadata),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
    archived_at: nullableFromDbUnixSeconds(row.archivedAt),
  }
}

/**
 * The owning app's identity is denormalized onto the product so a catalog list
 * can show which app a plan belongs to without a request per row.
 */
export function serializeProduct(row: ProductRow): Product {
  return {
    object: 'product',
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    app_id: row.appId,
    app_slug: row.app?.slug ?? null,
    app_name: row.app?.name ?? null,
    app_logo_url: row.app?.logoUrl ?? null,
    app_kind: row.app?.appKind ?? null,
    status: row.status,
    active: row.active,
    statement_descriptor: row.statementDescriptor,
    unit_label: row.unitLabel,
    tax_code_id: row.taxCodeId,
    lookup_key: row.lookupKey,
    metadata: asObject(row.metadata),
    prices: row.prices.map(serializePrice),
    module_ids: row.planModules.map((entitlement) => entitlement.moduleId),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
    archived_at: nullableFromDbUnixSeconds(row.archivedAt),
  }
}
