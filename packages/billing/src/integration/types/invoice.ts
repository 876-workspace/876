import type { List } from '../../types'
import type { BillingSource } from './common'
import type { BillingInvoiceStatus } from './enums'

/**
 * A line used when creating an invoice through the integration API.
 */
export interface BillingInvoiceLineCreateParams {
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
   * Unit amount in the smallest currency unit or as a decimal string.
   */
  unitAmount?: number | string | null

  /**
   * Tax amount in the smallest currency unit or as a decimal string.
   */
  taxAmount?: number | string

  /**
   * Discount amount in the smallest currency unit or as a decimal string.
   */
  discountAmount?: number | string
}

/**
 * Parameters for creating an invoice through the integration API.
 */
export interface BillingInvoiceCreateParams {
  /**
   * ID of the customer who receives the invoice.
   */
  customerId: string

  /**
   * ID of the subscription that generated the invoice, if any.
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
  taxBehavior?: 'EXCLUSIVE' | 'INCLUSIVE'

  /**
   * Document-level discount in the smallest currency unit or as a decimal string.
   */
  discountAmount?: number | string

  /**
   * Shipping amount in the smallest currency unit or as a decimal string.
   */
  shippingAmount?: number | string

  /**
   * Manual adjustment amount in the smallest currency unit or as a decimal string.
   */
  adjustmentAmount?: number | string

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
  lines: BillingInvoiceLineCreateParams[]

  /**
   * External reference for the product app that created the invoice.
   */
  sourceExternalReference?: string | null
}

/**
 * Parameters for updating an invoice.
 */
export interface BillingInvoiceUpdateParams {
  /**
   * Time at which the invoice is issued. Measured in seconds since the Unix epoch.
   */
  issueAt?: number | null

  /**
   * Time at which the invoice is due. Measured in seconds since the Unix epoch.
   */
  dueAt?: number | null

  /**
   * Notes printed on the invoice.
   */
  notes?: string | null

  /**
   * Payment terms printed on the invoice.
   */
  terms?: string | null

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
}

/**
 * Parameters for finalizing a draft invoice.
 */
export interface BillingInvoiceFinalizeParams {
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
export interface BillingInvoiceVoidParams {
  /**
   * An arbitrary reason recorded with the void.
   */
  reason?: string | null
}

/**
 * A single line on a Billing invoice.
 */
export interface BillingInvoiceLine {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'invoice_line'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the catalog item this line references, if any.
   */
  itemId: string | null

  /**
   * ID of the price this line references, if any.
   */
  priceId: string | null

  /**
   * An arbitrary description of the line. Often useful for displaying to users.
   */
  description: string

  /**
   * Unit name shown next to quantities.
   */
  unit: string | null

  /**
   * Display position of the line on the invoice.
   */
  position: number

  /**
   * Quantity of units for the line.
   */
  quantity: number

  /**
   * Unit amount as a decimal string.
   */
  unitAmount: string

  /**
   * Tax amount as a decimal string.
   */
  taxAmount: string

  /**
   * Discount amount as a decimal string.
   */
  discountAmount: string

  /**
   * Total amount as a decimal string.
   */
  totalAmount: string

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
 * This object represents an invoice exposed through the integration API.
 */
export interface BillingInvoice {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'invoice'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Source metadata from the product app that created the invoice, if any.
   */
  source: BillingSource | null

  /**
   * ID of the customer who receives the invoice.
   */
  customerId: string

  /**
   * ID of the quote converted into this invoice, if any.
   */
  quoteId: string | null

  /**
   * ID of the estimate converted into this invoice, if any.
   */
  estimateId: string | null

  /**
   * ID of the subscription that generated the invoice, if any.
   */
  subscriptionId: string | null

  /**
   * The invoice number.
   */
  number: string

  /**
   * Lifecycle status of the invoice.
   */
  status: BillingInvoiceStatus

  /**
   * Reason the invoice was created (for example, subscription or manual).
   */
  billingReason: string

  /**
   * Three-letter ISO currency code for the invoice.
   */
  currency: string

  /**
   * Customer-facing order number.
   */
  orderNumber: string | null

  /**
   * An arbitrary reference number attached to the invoice.
   */
  referenceNumber: string | null

  /**
   * A short subject line for the invoice.
   */
  subject: string | null

  /**
   * Tax behavior applied to the invoice totals. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'

  /**
   * Time at which the invoice was issued. Measured in seconds since the Unix epoch.
   */
  issueAt: number | null

  /**
   * Time at which the invoice is due. Measured in seconds since the Unix epoch.
   */
  dueAt: number | null

  /**
   * Time at which the invoice was sent. Measured in seconds since the Unix epoch.
   */
  sentAt: number | null

  /**
   * Time at which the invoice was paid. Measured in seconds since the Unix epoch.
   */
  paidAt: number | null

  /**
   * Time at which the invoice was voided. Measured in seconds since the Unix epoch.
   */
  voidedAt: number | null

  /**
   * Subtotal amount as a decimal string.
   */
  subtotalAmount: string

  /**
   * Tax amount as a decimal string.
   */
  taxAmount: string

  /**
   * Discount amount as a decimal string.
   */
  discountAmount: string

  /**
   * Shipping amount as a decimal string.
   */
  shippingAmount: string

  /**
   * Adjustment amount as a decimal string.
   */
  adjustmentAmount: string

  /**
   * Total amount as a decimal string.
   */
  totalAmount: string

  /**
   * Remaining amount due as a decimal string.
   */
  amountDue: string

  /**
   * Amount paid as a decimal string.
   */
  amountPaid: string

  /**
   * Amount credited as a decimal string.
   */
  amountCredited: string

  /**
   * Amount written off as a decimal string.
   */
  amountWrittenOff: string

  /**
   * Notes printed on the invoice.
   */
  notes: string | null

  /**
   * Payment terms printed on the invoice.
   */
  terms: string | null

  /**
   * Set of key-value pairs attached to the invoice.
   */
  metadata: unknown | null

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number

  /**
   * The customer who receives the invoice, when expanded.
   */
  customer?: { object: 'customer'; id: string; name: string }

  /**
   * Line items on the invoice, when expanded.
   */
  lines?: BillingInvoiceLine[]
}

/**
 * Parameters for listing Billing invoices.
 */
export interface BillingInvoiceListParams {
  /**
   * Filter by invoice status.
   */
  status?: BillingInvoiceStatus
}

/**
 * A list of Billing invoices.
 */
export type BillingInvoiceList = List<BillingInvoice>
