import type { List } from './common'

/** Parameters for listing credit notes. */
export interface CreditNoteListParams {
  /** Limits results to one credit-note lifecycle status. */
  status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'VOID'
}

/** A single line on a credit note. */
export interface CreditNoteLineCreateParams {
  /** Optional catalog item reference. */
  itemId?: string | null
  /** Optional catalog price reference. */
  priceId?: string | null
  /** Customer-facing line description. */
  description: string
  /** Number of units. */
  quantity?: number
  /** Unit amount represented as an integer minor-unit string. */
  unitAmount: string
  /** Tax amount represented as an integer minor-unit string. */
  taxAmount?: string
  /** Discount amount represented as an integer minor-unit string. */
  discountAmount?: string
}

/** Parameters for creating a credit note. */
export interface CreditNoteCreateParams {
  /** ID of the customer receiving the credit. */
  customerId: string
  /** Three-letter ISO currency code. */
  currency: string
  /** Optional invoice to credit. */
  invoiceId?: string | null
  /** Short reason recorded with the credit. */
  reason?: string | null
  /** Notes printed on the credit note. */
  notes?: string | null
  /** Terms printed on the credit note. */
  terms?: string | null
  /** Time at which the credit note is issued, in Unix seconds. */
  issueAt?: number
  /** Credit-note lines. */
  lines: CreditNoteLineCreateParams[]
}

/** One allocation that applies credit to an invoice. */
export interface CreditNoteAllocationParams {
  /** ID of the invoice receiving the credit. */
  invoiceId: string
  /** Amount represented as an integer minor-unit string. */
  amount: string
}

/** Parameters for applying a credit note to invoices. */
export interface CreditNoteApplyParams {
  /** Allocations to apply. */
  allocations: CreditNoteAllocationParams[]
}

/** A tenant credit note. */
export type CreditNote = {
  object: 'credit_note'
  id: string
} & Record<string, unknown>

/** Paginated list of credit notes. */
export type CreditNoteList = List<CreditNote>
