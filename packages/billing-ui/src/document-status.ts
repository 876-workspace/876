/** Badge variants the shared finance surfaces use. Mirrors `@876/ui`'s Badge. */
export type DocumentStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'info'
  | 'success'
  | 'warning'

/**
 * Badge variant for a sales-document status (invoice, quote, estimate, credit
 * note, sales receipt). One mapping for all of them, so the same word never
 * renders in two different colours across finance apps.
 */
export function documentStatusVariant(status: string): DocumentStatusVariant {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'ACCEPTED':
    case 'CLOSED':
      return 'success'

    case 'OPEN':
    case 'SENT':
    case 'ISSUED':
      return 'info'

    case 'PAST_DUE':
    case 'OVERDUE':
    case 'EXPIRED':
      return 'warning'

    case 'VOID':
    case 'UNCOLLECTIBLE':
    case 'DECLINED':
    case 'REJECTED':
      return 'destructive'

    default:
      return 'secondary'
  }
}

/** One option in a sales-document status filter. */
export interface DocumentStatusOption {
  value: string
  label: string
  headingLabel: string
}

/** Badge variant for a recurring invoice profile status. Green is active only. */
export function recurringInvoiceStatusVariant(
  status: string
): DocumentStatusVariant {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success'
    case 'stopped':
      return 'destructive'
    case 'expired':
      return 'warning'
    case 'paused':
    default:
      return 'secondary'
  }
}

export const RECURRING_INVOICE_STATUSES = [
  'active',
  'paused',
  'stopped',
  'expired',
] as const

export type RecurringInvoiceStatus =
  (typeof RECURRING_INVOICE_STATUSES)[number]

export const RECURRING_INVOICE_STATUS_OPTIONS: DocumentStatusOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Recurring Invoices' },
  { value: 'active', label: 'Active', headingLabel: 'Active Recurring Invoices' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Recurring Invoices' },
  {
    value: 'stopped',
    label: 'Stopped',
    headingLabel: 'Stopped Recurring Invoices',
  },
  {
    value: 'expired',
    label: 'Expired',
    headingLabel: 'Expired Recurring Invoices',
  },
]

export function isRecurringInvoiceStatus(
  value: string | null | undefined
): value is RecurringInvoiceStatus {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'stopped' ||
    value === 'expired'
  )
}

/** Narrows an unknown query value to a supported recurring-invoice filter value. */
export function resolveRecurringInvoiceStatus(
  value: string | null | undefined
): string {
  return isRecurringInvoiceStatus(value) ? value : 'all'
}

export const SALES_RECEIPT_STATUS_OPTIONS: DocumentStatusOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Sales Receipts' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Sales Receipts' },
  { value: 'void', label: 'Void', headingLabel: 'Void Sales Receipts' },
]

const SALES_RECEIPT_STATUS_VALUES = SALES_RECEIPT_STATUS_OPTIONS.filter(
  (option) => option.value !== 'all'
).map((option) => option.value)

export function resolveSalesReceiptStatus(
  value: string | null | undefined
): string {
  return value && SALES_RECEIPT_STATUS_VALUES.includes(value) ? value : 'all'
}

/**
 * Every filterable invoice status, in lifecycle order.
 *
 * Mirrors the `InvoiceStatus` enum in the Billing API. It lives here rather
 * than in each host so Billing and Invoice cannot drift apart — which is
 * exactly how `OPEN`, `PARTIALLY_PAID`, and `UNCOLLECTIBLE` went missing.
 */
export const INVOICE_STATUS_OPTIONS: DocumentStatusOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'open', label: 'Open', headingLabel: 'Open Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  {
    value: 'partially_paid',
    label: 'Partially paid',
    headingLabel: 'Partially Paid Invoices',
  },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  {
    value: 'uncollectible',
    label: 'Uncollectible',
    headingLabel: 'Uncollectible Invoices',
  },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

/** The filter values above, excluding the `all` sentinel. */
export const INVOICE_STATUS_VALUES: string[] = INVOICE_STATUS_OPTIONS.filter(
  (option) => option.value !== 'all'
).map((option) => option.value)

/** Narrows an unknown query value to a supported invoice filter value. */
export function resolveInvoiceStatus(value: string | null | undefined): string {
  return value && INVOICE_STATUS_VALUES.includes(value) ? value : 'all'
}
