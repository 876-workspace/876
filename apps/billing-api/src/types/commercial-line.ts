import type { StockTarget } from './commerce'

/**
 * Internal immutable sell/credit line snapshot. Workflows may resolve this from
 * Catalog + Pricing or accept an already-snapshotted amount, but persistence
 * never needs to reinterpret current Item/Variant state later.
 */
export interface CommercialLineSnapshot {
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  description: string
  unit: string | null
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  stockTarget: StockTarget | null
}
