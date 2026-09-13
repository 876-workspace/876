import type { JsonValue, List, MinorAmount } from './common'

export type SalesOrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'canceled'

export type SalesOrderPaymentStatus =
  | 'unpaid'
  | 'partially-paid'
  | 'paid'
  | 'partially-refunded'
  | 'refunded'

export type SalesOrderFulfillmentStatus =
  | 'unfulfilled'
  | 'partially-fulfilled'
  | 'fulfilled'

export interface SalesOrderLineParams {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  description?: string | null
  quantity: number
  unitAmount?: MinorAmount | null
  taxAmount?: MinorAmount
  discountAmount?: MinorAmount
}

export interface SalesOrderCreateParams {
  customerId: string
  number?: string
  currency: string
  priceListId?: string | null
  orderedAt?: number | null
  notes?: string | null
  terms?: string | null
  metadata?: Record<string, JsonValue> | null
  lines: SalesOrderLineParams[]
}

export interface SalesOrderUpdateParams {
  customerId?: string
  number?: string
  currency?: string
  priceListId?: string | null
  orderedAt?: number | null
  notes?: string | null
  terms?: string | null
  metadata?: Record<string, JsonValue> | null
  lines?: SalesOrderLineParams[]
}

export interface SalesOrderListParams {
  status?: SalesOrderStatus
  paymentStatus?: SalesOrderPaymentStatus
  fulfillmentStatus?: SalesOrderFulfillmentStatus
  customerId?: string
}

export interface SalesOrderLine {
  object: 'sales-order-line'
  id: string
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  description: string
  unit: string | null
  quantity: number
  unitAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  createdAt: number
  updatedAt: number
}

export interface SalesOrderSummary {
  object: 'sales-order'
  id: string
  customerId: string
  priceListId: string | null
  priceListName: string | null
  number: string
  status: SalesOrderStatus
  paymentStatus: SalesOrderPaymentStatus
  fulfillmentStatus: SalesOrderFulfillmentStatus
  currency: string
  orderedAt: number | null
  confirmedAt: number | null
  processingAt: number | null
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

export interface DeletedSalesOrder {
  object: 'sales-order'
  id: string
  deleted: true
}

export type SalesOrderList = List<SalesOrderSummary>
