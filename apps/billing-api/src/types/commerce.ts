export interface ActorContext {
  userId?: string
  serviceId?: string
  sourceAppId?: string
}

export interface ResourceOrigin {
  sourceAppId: string | null
  externalSystem: string | null
  externalReference: string | null
}

export interface ResourceReference {
  type: string
  id: string
}

export interface SellableReference {
  itemId: string
  variantId: string | null
}

export type StockTarget =
  | { type: 'item'; id: string }
  | { type: 'variant'; id: string }

export interface ResolvedSellable {
  reference: SellableReference
  identity: {
    name: string
    variantName: string | null
    sku: string | null
  }
  type: 'GOOD' | 'SERVICE'
  unit: string | null
  taxable: boolean
  taxCode: string | null
  defaultSellingAmount: bigint | null
  defaultSellingCurrency: string | null
  pricingReference: SellableReference
  stockTarget: StockTarget | null
  primaryFileId: string | null
}

/** Optional replay context derived from a trusted HTTP header + canonical request. */
export interface IdempotencyContext {
  key: string
  requestHash: string
}

export interface CommerceContext {
  tenantId: string
  actor?: ActorContext
  origin?: ResourceOrigin
  customerId?: string
  currency?: string
  idempotency?: IdempotencyContext
  /** Reserved context seam. No Channel persistence exists yet. */
  channelId?: string
  /** Reserved context seam. No Stock Location persistence exists yet. */
  locationId?: string
}
