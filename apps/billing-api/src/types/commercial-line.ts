/**
 * Canonical input accepted by commercial transaction line resolvers. It stays
 * neutral so Quotes, Invoices, Sales Receipts, and Sales Orders can reuse the
 * same Catalog + Pricing + Tax + monetary calculation path.
 */
export interface CommercialLineInput {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  taxRateId?: string | null
  description?: string | null
  quantity: number
  unitAmount?: bigint | null
  taxAmount?: bigint
  discountAmount?: bigint
}

/**
 * Internal immutable commercial line snapshot. Workflows may resolve this from
 * Catalog + Pricing + Tax or accept an already-snapshotted amount, but
 * persistence never needs to reinterpret current Item/Variant/Tax state later.
 */
export interface CommercialLineSnapshot {
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  taxRateId: string | null
  description: string
  unit: string | null
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  taxName: string | null
  taxRate: string | null
  taxInclusive: boolean
  discountAmount: bigint
  totalAmount: bigint
}
