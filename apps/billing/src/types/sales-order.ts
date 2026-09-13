export type SalesOrderStatus = 'draft' | 'confirmed' | 'completed' | 'canceled'

export type SalesOrderResource = {
  object: 'sales-order'
  id: string
  number: string
  status: SalesOrderStatus
  customerId: string
  customerName: string | null
  currency: string
  totalAmount: string
  invoicingStatus: 'not-invoiced' | 'invoiced'
  paymentStatus: 'unpaid' | 'partially-paid' | 'paid' | null
  invoiceId: string | null
  orderedAt: number
  referenceNumber: string | null
  notes: string | null
  terms: string | null
  lines: Array<{
    id: string
    itemId: string | null
    variantId: string | null
    priceId: string | null
    description: string
    quantity: number
    unitAmount: string
    discountAmount: string
    taxAmount: string
  }>
} & Record<string, unknown>

export type SalesOrderCreateInput = {
  customerId: string
  currency?: string
  priceListId?: string | null
  salespersonId?: string | null
  referenceNumber?: string | null
  notes?: string | null
  terms?: string | null
  lines: Array<Record<string, unknown>>
}
