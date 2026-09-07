export const RESTRICTED_INVOICE_EDIT_FIELDS = [
  'dueAt',
  'notes',
  'terms',
  'referenceNumber',
] as const

export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

export function getInvoiceEditability(status: InvoiceStatus) {
  if (status === 'DRAFT')
    return { editable: true, deletable: true, restricted: false }
  if (
    status === 'OPEN' ||
    status === 'SENT' ||
    status === 'PARTIALLY_PAID' ||
    status === 'OVERDUE'
  )
    return {
      editable: true,
      deletable: false,
      restricted: true,
      fields: RESTRICTED_INVOICE_EDIT_FIELDS,
    }
  return { editable: false, deletable: false, restricted: false }
}
