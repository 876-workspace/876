import type { List, MinorAmount } from './common'
import type { DocumentLineCreateParams } from './invoice'
import type { TaxBehavior } from './enums'

export type SalesReceiptStatus = 'PAID' | 'VOID'
export type SalesReceiptRefundStatus = 'NONE' | 'PARTIALLY_REFUNDED' | 'REFUNDED'

export interface SalesReceiptLineCreateParams extends DocumentLineCreateParams {
  /** Variant selected for this line when the Item is variant-mode. */
  variantId?: string | null
}

export interface SalesReceiptCreateParams {
  quoteId?: string | null
  customerId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  receiptAt?: number
  referenceNumber?: string | null
  taxBehavior?: TaxBehavior
  discountAmount?: MinorAmount
  notes?: string | null
  terms?: string | null
  lines?: SalesReceiptLineCreateParams[]
  paymentModeId: string
  depositAccountId: string
  paymentDate?: number
  paymentReferenceNumber?: string | null
  bankCharges?: MinorAmount
}

export interface SalesReceiptQuoteConversionParams {
  salespersonId?: string | null
  receiptAt?: number
  referenceNumber?: string | null
  taxBehavior?: TaxBehavior
  notes?: string | null
  terms?: string | null
  paymentModeId: string
  depositAccountId: string
  paymentDate?: number
  paymentReferenceNumber?: string | null
  bankCharges?: MinorAmount
}

export interface SalesReceiptReturnLineParams {
  salesReceiptLineId: string
  quantity: number
}

export interface SalesReceiptRefundParams {
  amount: MinorAmount
  reason?: string | null
  notes?: string | null
  refundedAt?: number
  paymentModeId?: string | null
  depositAccountId?: string | null
  returnLines?: SalesReceiptReturnLineParams[]
}

export interface SalesReceiptVoidParams {
  reason?: string | null
}

export interface SalesReceiptListParams {
  status?: SalesReceiptStatus
  customerId?: string
}

export type SalesReceipt = {
  object: 'sales_receipt'
  id: string
  number: string
  status: SalesReceiptStatus
  refundStatus: SalesReceiptRefundStatus
  currency: string
  totalAmount: string
  creditedAmount: string
  refundedAmount: string
  refundableAmount: string
  receiptAt: number
} & Record<string, unknown>

export type SalesReceiptList = List<SalesReceipt>
