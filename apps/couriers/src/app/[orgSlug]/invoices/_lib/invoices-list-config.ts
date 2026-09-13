import type { BillingInvoiceStatus } from '@876/billing/integration'

export const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

export const INVOICES_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const },
  { label: 'Export', icon: 'export' as const },
  {
    label: 'Delete invoices',
    icon: 'delete' as const,
    destructive: true,
    separator: true,
  },
]

/** URL status value → the Billing invoice status the list call filters on. */
const INVOICE_STATUS_FILTERS: Record<string, BillingInvoiceStatus> = {
  draft: 'DRAFT',
  sent: 'SENT',
  overdue: 'OVERDUE',
  paid: 'PAID',
  void: 'VOID',
}

export function resolveInvoiceStatus(status: string | undefined): {
  selected: string
  filter: BillingInvoiceStatus | undefined
} {
  const filter = status ? INVOICE_STATUS_FILTERS[status] : undefined
  return filter && status
    ? { selected: status, filter }
    : { selected: 'all', filter: undefined }
}
