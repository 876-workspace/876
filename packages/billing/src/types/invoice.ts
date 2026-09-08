import type { LateFeeCalculationType, TaxBehavior } from './enums'
import type { MinorAmount } from './common'

/**
 * A line used when creating a quote or invoice.
 */
export interface DocumentLineCreateParams {
  /** ID of the catalog item this line references, if any. */
  itemId?: string | null
  /** ID of the price this line references, if any. */
  priceId?: string | null
  /** An arbitrary description of the line. */
  description?: string | null
  /** The quantity of units for the line. */
  quantity?: number
  /** Unit amount in the smallest currency unit when overriding the catalog price. */
  unitAmount?: MinorAmount | null
  /** Tax amount in the smallest currency unit for the line. */
  taxAmount?: MinorAmount
  /** Discount amount in the smallest currency unit for the line. */
  discountAmount?: MinorAmount
}

/** Parameters for creating a draft invoice. */
export interface InvoiceCreateParams {
  quoteId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  issueAt?: number
  dueAt?: number
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
  taxBehavior?: TaxBehavior
  discountAmount?: MinorAmount
  shippingAmount?: MinorAmount
  adjustmentAmount?: MinorAmount
  notes?: string | null
  terms?: string | null
  lines?: DocumentLineCreateParams[]
}

/** Parameters for updating tenant invoice preferences. */
export interface InvoicePreferenceUpdateParams {
  defaultTaxBehavior: TaxBehavior
  defaultNotes?: string | null
  defaultTerms?: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: LateFeeCalculationType
  lateFeePercent: number | null
  lateFeeAmount: MinorAmount | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
}

/** Tenant defaults that control invoice presentation and late fees. */
export interface InvoicePreference {
  object: 'invoice_preference'
  tenantId: string
  defaultTaxBehavior: TaxBehavior
  defaultNotes: string | null
  defaultTerms: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: LateFeeCalculationType
  lateFeePercent: string | null
  lateFeeAmount: string | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
  createdAt: number
  updatedAt: number
}

/** A confirmation returned after updating invoice preferences. */
export interface InvoicePreferenceUpdated {
  object: 'invoice_preference'
  tenantId: string
}

/** Summary of a late-fee generation run. */
export interface LateFeeRun {
  object: 'late_fee_run'
  created: number
  skipped: number
  hasMore: boolean
}

/** Parameters for finalizing a draft invoice. */
export interface InvoiceFinalizeParams {
  paymentTermId?: string | null
  salespersonId?: string | null
  autoApplyCredits?: boolean
}

/** Parameters for voiding an invoice. */
export interface InvoiceVoidParams {
  reason?: string | null
}

/** Parameters for writing off an invoice's full remaining receivable. */
export interface InvoiceWriteOffParams {
  /** Required audit reason for the write-off. */
  reason: string
}

/** Parameters for updating a draft invoice. */
export interface InvoiceUpdateParams {
  issueAt?: number | null
  dueAt?: number | null
  notes?: string | null
  terms?: string | null
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
}

/** A minimal invoice resource returned after creation or lifecycle commands. */
export interface InvoiceCreated {
  object: 'invoice'
  id: string
}

/** A tombstone returned after deleting a draft invoice. */
export interface DeletedInvoice {
  object: 'invoice'
  id: string
  deleted: true
}

/** Parameters for listing invoices. */
export interface InvoiceListParams {
  status?:
    | 'DRAFT'
    | 'OPEN'
    | 'SENT'
    | 'PARTIALLY_PAID'
    | 'OVERDUE'
    | 'PAID'
    | 'UNCOLLECTIBLE'
    | 'VOID'
}

/** A tenant invoice resource returned by the list endpoint. */
export type Invoice = {
  object: 'invoice'
  id: string
} & Record<string, unknown>

/** Paginated list of invoices. */
export type InvoiceList = import('./common').List<Invoice>

/** Parameters for listing quotes. */
export interface QuoteListParams {
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED'
}

/** A line included when creating a quote. */
export interface QuoteLineCreateParams extends DocumentLineCreateParams {
  unitAmount?: string | null
  taxAmount?: string
  discountAmount?: string
}

/** Parameters for creating a quote. */
export interface QuoteCreateParams {
  customerId: string
  priceListId?: string | null
  currency?: string
  issueAt?: number
  expiresAt?: number
  notes?: string | null
  terms?: string | null
  lines: QuoteLineCreateParams[]
}

/** Parameters for updating a draft quote. */
export interface QuoteUpdateParams {
  issueAt?: number | null
  expiresAt?: number | null
  notes?: string | null
  terms?: string | null
}

/** A tenant quote resource returned by the list endpoint. */
export type Quote = {
  object: 'quote'
  id: string
} & Record<string, unknown>

/** Paginated list of quotes. */
export type QuoteList = import('./common').List<Quote>

/** A tombstone returned after deleting a draft quote. */
export interface DeletedQuote {
  object: 'quote'
  id: string
  deleted: true
}
