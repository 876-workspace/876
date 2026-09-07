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

export interface CommerceContext {
  tenantId: string
  actor?: ActorContext
  origin?: ResourceOrigin
  customerId?: string
  currency?: string
  /** Reserved context seam. No Channel persistence exists yet. */
  channelId?: string
  /** Reserved context seam. No Stock Location persistence exists yet. */
  locationId?: string
}
