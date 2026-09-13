import type { JsonValue, List, MinorAmount } from './common'
import type { TaxBehavior } from './enums'

export type SalesOrderStatus =
  | 'draft'
  | 'confirmed'
  | 'completed'
  | 'canceled'

export type SalesOrderInvoicingStatus = 'not-invoiced' | 'invoiced'
export type SalesOrderPaymentStatus = 'unpaid' | 'partially-paid' | 'paid'

export interface SalesOrderLineParams {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  taxRateId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: MinorAmount | null
  taxAmount?: MinorAmount
  discountAmount?: MinorAmount
}

export interface SalesOrderCreateParams {
  customerId: string
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  orderedAt?: number
  referenceNumber?: string | null
  taxBehavior?: TaxBehavior
  notes?: string | null
  terms?: string | null
  metadata?: Record<string, JsonValue> | null
  lines: SalesOrderLineParams[]
}

export interface SalesOrderUpdateParams {
  customerId?: string
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  orderedAt?: number
  referenceNumber?: string | null
  taxBehavior?: TaxBehavior
  notes?: string | null
  terms?: string | null
  metadata?: Record<string, JsonValue> | null
  lines?: SalesOrderLineParams[]
}

export interface SalesOrderQuoteConversionParams {
  salespersonId?: string | null
  orderedAt?: number
  referenceNumber?: string | null
  taxBehavior?: TaxBehavior
  notes?: string | null
  terms?: string | null
}

export interface SalesOrderListParams {
  status?: SalesOrderStatus
  customerId?: string
  starting_after?: string
  ending_before?: string
  limit?: number
}

export interface SalesOrderLine {
  object: 'sales-order-line'
  id: string
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  taxRateId: string | null
  description: string
  unit: string | null
  position: number
  quantity: number
  unitAmount: string
  taxAmount: string
  taxName: string | null
  taxRate: string | null
  taxInclusive: boolean
  discountAmount: string
  totalAmount: string
  createdAt: number
  updatedAt: number
}

export interface SalesOrderSummary {
  object: 'sales-order'
  id: string
  customerId: string
  customerName: string | null
  customerEmail: string | null
  priceListId: string | null
  priceListName: string | null
  quoteId: string | null
  salespersonId: string | null
  salespersonName: string | null
  number: string
  status: SalesOrderStatus
  invoicingStatus: SalesOrderInvoicingStatus
  paymentStatus: SalesOrderPaymentStatus | null
  invoiceId: string | null
  currency: string
  referenceNumber: string | null
  taxBehavior: TaxBehavior
  billingAddressSnapshot: JsonValue | null
  shippingAddressSnapshot: JsonValue | null
  orderedAt: number
  confirmedAt: number | null
  completedAt: number | null
  canceledAt: number | null
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  notes: string | null
  terms: string | null
  metadata: JsonValue | null
  createdAt: number
  updatedAt: number
}

export interface SalesOrder extends SalesOrderSummary {
  lines: SalesOrderLine[]
}

export type SalesOrderList = List<SalesOrderSummary>
