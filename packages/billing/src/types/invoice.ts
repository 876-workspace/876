import type { MinorAmount } from './common'
import type { LateFeeCalculationType, TaxBehavior } from './enums'

/** A line used when creating a quote or invoice. */
export interface DocumentLineCreateParams {
  itemId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: MinorAmount | null
  taxAmount?: MinorAmount
  discountAmount?: MinorAmount
}

/** Parameters for creating a draft invoice. */
export interface InvoiceCreateParams {
  quoteId?: string | null
  estimateId?: string | null
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

/** A minimal invoice resource returned after creation. */
export interface InvoiceCreated {
  object: 'invoice'
  id: string
}

/** Statuses emitted by the invoice data model. */
export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

/** Statuses emitted by quote resources. */
export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELED'

/** Statuses emitted by estimate resources. */
export type EstimateStatus = QuoteStatus

/** Billing reasons emitted by invoice resources. */
export type InvoiceBillingReason =
  | 'MANUAL'
  | 'QUOTE'
  | 'ESTIMATE'
  | 'SUBSCRIPTION_CREATE'
  | 'SUBSCRIPTION_CYCLE'
  | 'SUBSCRIPTION_UPDATE'
  | 'OPENING_BALANCE'
  | 'LATE_FEE'

/** Stable customer projection expanded on commercial documents. */
export interface DocumentCustomer {
  object: 'customer'
  id: string
  name: string
}

/** Stable invoice-line projection returned by invoice lists. */
export interface InvoiceLine {
  object: 'invoice_line'
  id: string
  itemId: string | null
  priceId: string | null
  description: string
  quantity: number
  unitAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  createdAt: number
  updatedAt: number
}

/** Stable quote/estimate line projection returned by list endpoints. */
export interface ProposalLine {
  id: string
  itemId: string | null
  priceId: string | null
  description: string
  quantity: number
  unitAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  createdAt: number
  updatedAt: number
}

/** Parameters for listing invoices. */
export interface InvoiceListParams {
  status?: InvoiceStatus
}

/**
 * Stable tenant invoice contract.
 *
 * The Billing API may return additional internal fields. Runtime parsing keeps
 * this public DTO intentionally bounded so application code cannot couple to
 * arbitrary Prisma fields or reconstruct the resource through casts.
 */
export interface Invoice {
  object: 'invoice'
  id: string
  customerId: string
  quoteId: string | null
  estimateId: string | null
  subscriptionId: string | null
  number: string
  status: InvoiceStatus
  billingReason: InvoiceBillingReason
  currency: string
  orderNumber: string | null
  referenceNumber: string | null
  subject: string | null
  taxBehavior: TaxBehavior
  customerName: string | null
  customerEmail: string | null
  issueAt: number | null
  dueAt: number | null
  sentAt: number | null
  paidAt: number | null
  voidedAt: number | null
  finalizedAt: number | null
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  shippingAmount: string
  adjustmentAmount: string
  totalAmount: string
  amountDue: string
  amountPaid: string
  amountCredited: string
  amountWrittenOff: string
  notes: string | null
  terms: string | null
  createdAt: number
  updatedAt: number
  customer: DocumentCustomer
  lines: InvoiceLine[]
}

/** Paginated list of invoices. */
export type InvoiceList = import('./common').List<Invoice>

/** Parameters for listing quotes. */
export interface QuoteListParams {
  status?: QuoteStatus
}

/** Stable tenant quote contract. */
export interface Quote {
  object: 'quote'
  id: string
  customerId: string
  number: string
  status: QuoteStatus
  currency: string
  issueAt: number | null
  expiresAt: number | null
  acceptedAt: number | null
  declinedAt: number | null
  canceledAt: number | null
  subtotalAmount: string
  taxAmount: string
  totalAmount: string
  notes: string | null
  terms: string | null
  createdAt: number
  updatedAt: number
  customer: DocumentCustomer
  lines: ProposalLine[]
  convertedInvoice: { id: string; number: string } | null
}

/** Paginated list of quotes. */
export type QuoteList = import('./common').List<Quote>

/** Parameters for listing estimates. */
export interface EstimateListParams {
  status?: EstimateStatus
}

/** Stable tenant estimate contract. */
export interface Estimate {
  object: 'estimate'
  id: string
  customerId: string
  number: string
  status: EstimateStatus
  currency: string
  issueAt: number | null
  expiresAt: number | null
  acceptedAt: number | null
  declinedAt: number | null
  canceledAt: number | null
  subtotalAmount: string
  taxAmount: string
  totalAmount: string
  notes: string | null
  terms: string | null
  createdAt: number
  updatedAt: number
  customer: DocumentCustomer
  lines: ProposalLine[]
}

/** Paginated list of estimates. */
export type EstimateList = import('./common').List<Estimate>
