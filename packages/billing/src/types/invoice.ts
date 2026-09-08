import type { LateFeeCalculationType, TaxBehavior } from './enums'
import type { MinorAmount } from './common'

/**
 * A line used when creating a quote or invoice.
 */
export interface DocumentLineCreateParams {
  /**
   * ID of the catalog item this line references, if any.
   */
  itemId?: string | null

  /**
   * ID of the price this line references, if any.
   */
  priceId?: string | null

  /**
   * An arbitrary description of the line. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * The quantity of units for the line.
   */
  quantity?: number

  /**
   * Unit amount in the smallest currency unit when overriding the catalog price.
   */
  unitAmount?: MinorAmount | null

  /**
   * Tax amount in the smallest currency unit for the line.
   */
  taxAmount?: MinorAmount

  /**
   * Discount amount in the smallest currency unit for the line.
   */
  discountAmount?: MinorAmount
}

/**
 * Parameters for creating a draft invoice.
 */
export interface InvoiceCreateParams {
  /**
   * ID of the quote to convert into an invoice.
   */
  quoteId?: string | null

  /**
   * ID of the customer who receives the invoice.
   */
  customerId?: string | null

  /**
   * ID of the subscription that generated the invoice.
   */
  subscriptionId?: string | null

  /**
   * ID of the salesperson associated with the invoice.
   */
  salespersonId?: string | null

  /**
   * ID of the price list used when resolving line prices.
   */
  priceListId?: string | null

  /**
   * Three-letter ISO currency code for the invoice.
   */
  currency?: string

  /**
   * Time at which the invoice is issued. Measured in seconds since the Unix epoch.
   */
  issueAt?: number

  /**
   * Time at which the invoice is due. Measured in seconds since the Unix epoch.
   */
  dueAt?: number

  /**
   * Customer-facing order number.
   */
  orderNumber?: string | null

  /**
   * An arbitrary reference number attached to the invoice.
   */
  referenceNumber?: string | null

  /**
   * A short subject line for the invoice.
   */
  subject?: string | null

  /**
   * Tax behavior applied to the invoice totals. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  taxBehavior?: TaxBehavior

  /**
   * Document-level discount in the smallest currency unit.
   */
  discountAmount?: MinorAmount

  /**
   * Shipping amount in the smallest currency unit.
   */
  shippingAmount?: MinorAmount

  /**
   * Manual adjustment amount in the smallest currency unit.
   */
  adjustmentAmount?: MinorAmount

  /**
   * Notes printed on the invoice.
   */
  notes?: string | null

  /**
   * Payment terms printed on the invoice.
   */
  terms?: string | null

  /**
   * Line items to include on the invoice.
   */
  lines?: DocumentLineCreateParams[]
}

/**
 * Parameters for updating tenant invoice preferences.
 */
export interface InvoicePreferenceUpdateParams {
  /**
   * Default tax behavior for newly created invoices. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  defaultTaxBehavior: TaxBehavior

  /**
   * Default notes applied to new invoices.
   */
  defaultNotes?: string | null

  /**
   * Default terms applied to new invoices.
   */
  defaultTerms?: string | null

  /**
   * Whether sent invoices remain editable.
   */
  allowEditingSentInvoices: boolean

  /**
   * Whether automatic late fees are enabled.
   */
  lateFeesEnabled: boolean

  /**
   * How late fees are calculated. One of `PERCENTAGE` or `FIXED`.
   */
  lateFeeCalculationType: LateFeeCalculationType

  /**
   * Late fee percentage when `lateFeeCalculationType` is `PERCENTAGE`.
   */
  lateFeePercent: number | null

  /**
   * Fixed late fee amount when `lateFeeCalculationType` is `FIXED`.
   */
  lateFeeAmount: MinorAmount | null

  /**
   * Number of grace days before late fees apply.
   */
  lateFeeGraceDays: number

  /**
   * Whether late-fee invoices are created as drafts.
   */
  lateFeeGenerateAsDraft: boolean
}

/**
 * Tenant defaults that control invoice presentation and late fees.
 */
export interface InvoicePreference {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'invoice_preference'

  /**
   * ID of the tenant that owns these preferences.
   */
  tenantId: string

  /**
   * Default tax behavior for newly created invoices. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  defaultTaxBehavior: TaxBehavior

  /**
   * Default notes applied to new invoices.
   */
  defaultNotes: string | null

  /**
   * Default terms applied to new invoices.
   */
  defaultTerms: string | null

  /**
   * Whether sent invoices remain editable.
   */
  allowEditingSentInvoices: boolean

  /**
   * Whether automatic late fees are enabled.
   */
  lateFeesEnabled: boolean

  /**
   * How late fees are calculated. One of `PERCENTAGE` or `FIXED`.
   */
  lateFeeCalculationType: LateFeeCalculationType

  /**
   * Late fee percentage as a decimal string.
   */
  lateFeePercent: string | null

  /**
   * Fixed late fee amount as a decimal string.
   */
  lateFeeAmount: string | null

  /**
   * Number of grace days before late fees apply.
   */
  lateFeeGraceDays: number

  /**
   * Whether late-fee invoices are created as drafts.
   */
  lateFeeGenerateAsDraft: boolean

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * A confirmation returned after updating invoice preferences.
 */
export interface InvoicePreferenceUpdated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'invoice_preference'

  /**
   * ID of the tenant that owns the updated preferences.
   */
  tenantId: string
}

/**
 * Summary of a late-fee generation run.
 */
export interface LateFeeRun {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'late_fee_run'

  /**
   * Number of late-fee invoices created.
   */
  created: number

  /**
   * Number of candidates skipped.
   */
  skipped: number

  /**
   * True if more candidates remain beyond this run's batch.
   */
  hasMore: boolean
}

/**
 * Parameters for finalizing a draft invoice.
 */
export interface InvoiceFinalizeParams {
  /**
   * ID of the payment term applied at finalize time.
   */
  paymentTermId?: string | null

  /**
   * ID of the salesperson applied at finalize time.
   */
  salespersonId?: string | null

  /**
   * Whether available credits should be applied automatically.
   */
  autoApplyCredits?: boolean
}

/**
 * Parameters for voiding an invoice.
 */
export interface InvoiceVoidParams {
  /**
   * An arbitrary reason recorded with the void.
   */
  reason?: string | null
}

/** Parameters for writing off an invoice's full remaining receivable. */
export interface InvoiceWriteOffParams {
  /** Required audit reason for the write-off. */
  reason: string
}

/** Parameters for updating a draft invoice. */
export interface InvoiceUpdateParams {
  /** Time at which the invoice is issued, in Unix seconds. */
  issueAt?: number | null
  /** Time at which the invoice is due, in Unix seconds. */
  dueAt?: number | null
  /** Notes printed on the invoice. */
  notes?: string | null
  /** Payment terms printed on the invoice. */
  terms?: string | null
  /** Customer-facing order number. */
  orderNumber?: string | null
  /** Arbitrary reference number attached to the invoice. */
  referenceNumber?: string | null
  /** Short subject line for the invoice. */
  subject?: string | null
}

/**
 * A minimal invoice resource returned after creation.
 */
export interface InvoiceCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'invoice'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/** A tombstone returned after deleting a draft invoice. */
export interface DeletedInvoice {
  /** String representing the object's type. */
  object: 'invoice'
  /** Unique identifier for the deleted invoice. */
  id: string
  /** Always true for a deleted resource. */
  deleted: true
}
/**
 * Parameters for listing invoices.
 */
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

/**
 * A tenant invoice resource returned by the list endpoint.
 * The API guarantees object/id and uses a passthrough shape for forward compat.
 */
export type Invoice = {
  object: 'invoice'
  id: string
} & Record<string, unknown>

/**
 * Paginated list of invoices.
 */
export type InvoiceList = import('./common').List<Invoice>

/**
 * Parameters for listing quotes.
 */
export interface QuoteListParams {
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED'
}

/** A line included when creating a quote. */
export interface QuoteLineCreateParams extends DocumentLineCreateParams {
  /** Unit amount in integer minor-unit string form when overriding a price. */
  unitAmount?: string | null
  /** Tax amount in integer minor-unit string form. */
  taxAmount?: string
  /** Discount amount in integer minor-unit string form. */
  discountAmount?: string
}

/** Parameters for creating a quote. */
export interface QuoteCreateParams {
  /** ID of the customer receiving the quote. */
  customerId: string
  /** ID of the price list used when resolving line prices. */
  priceListId?: string | null
  /** Three-letter ISO currency code. */
  currency?: string
  /** Time at which the quote is issued, in Unix seconds. */
  issueAt?: number
  /** Time at which the quote expires, in Unix seconds. */
  expiresAt?: number
  /** Notes printed on the quote. */
  notes?: string | null
  /** Terms printed on the quote. */
  terms?: string | null
  /** Line items to include on the quote. */
  lines: QuoteLineCreateParams[]
}

/** Parameters for updating a draft quote. */
export interface QuoteUpdateParams {
  /** Time at which the quote is issued, in Unix seconds. */
  issueAt?: number | null
  /** Time at which the quote expires, in Unix seconds. */
  expiresAt?: number | null
  /** Notes printed on the quote. */
  notes?: string | null
  /** Terms printed on the quote. */
  terms?: string | null
}

/**
 * A tenant quote resource returned by the list endpoint.
 * The API guarantees object/id and uses a passthrough shape for forward compat.
 */
export type Quote = {
  object: 'quote'
  id: string
} & Record<string, unknown>

/**
 * Paginated list of quotes.
 */
export type QuoteList = import('./common').List<Quote>

/** A tombstone returned after deleting a draft quote. */
export interface DeletedQuote {
  /** String representing the object's type. */
  object: 'quote'
  /** Unique identifier for the deleted quote. */
  id: string
  /** Always true for a deleted resource. */
  deleted: true
}
