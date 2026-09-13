/**
 * Canonical input accepted by commercial transaction line resolvers. It stays
 * neutral so Quotes, Invoices, Sales Receipts, and Sales Orders can reuse the
 * same Catalog + Pricing + Billing Engine path.
 */
export interface CommercialLineInput {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  description?: string | null
  quantity: number
  unitAmount?: bigint | null
  taxAmount?: bigint
  discountAmount?: bigint
}

/**
 * Internal immutable commercial line snapshot. Workflows may resolve this from
 * Catalog + Pricing or accept an already-snapshotted amount, but persistence
 * never needs to reinterpret current Item/Variant state later.
 *
 * The shape deliberately matches the persisted Quote/Invoice/Sales Order line
 * fields so it can be written without leaking transient resolver concepts such
 * as StockTarget.
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
}
