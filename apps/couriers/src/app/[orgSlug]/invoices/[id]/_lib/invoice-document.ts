import type {
  BillingInvoice,
  BillingInvoiceLine,
} from '@876/billing/integration'
import type {
  InvoiceDocumentPanelProps,
  InvoiceDocumentSeller,
} from '@876/billing-ui/panels/invoice-document-panel'

import { formatDate, formatMoney } from '@/lib/finance/format'

type DocumentProps = Omit<
  InvoiceDocumentPanelProps,
  'seller' | 'footer' | 'template' | 'branding'
>

/** An optional minor-unit amount is null when it carries no value. */
function isZeroAmount(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') return true
  try {
    return BigInt(value) === 0n
  } catch {
    return Number(value) === 0
  }
}

function optionalMoney(
  value: string | null | undefined,
  currency: string
): string | null {
  if (isZeroAmount(value)) return null
  return formatMoney(value as string, currency)
}

function mapLine(
  line: BillingInvoiceLine,
  currency: string
): DocumentProps['invoice']['lines'][number] {
  return {
    id: line.id,
    description: line.description || 'Item',
    quantity: line.quantity,
    servicePeriod: null,
    unitAmount: formatMoney(line.unitAmount, currency),
    discountAmount: optionalMoney(line.discountAmount, currency),
    taxAmount: optionalMoney(line.taxAmount, currency),
    totalAmount: formatMoney(line.totalAmount, currency),
  }
}

/**
 * Couriers-specific adapter from the integration `BillingInvoice` to the
 * templated document panel props. Pure: no I/O, no mutation.
 */
export function toInvoiceDocumentProps(
  invoice: BillingInvoice,
  _seller: InvoiceDocumentSeller
): DocumentProps {
  const meta: Array<{ label: string; value: string | null }> = [
    { label: 'Invoice date', value: formatDate(invoice.issueAt) },
    { label: 'Due date', value: formatDate(invoice.dueAt) },
  ]
  if (invoice.sentAt !== null && invoice.sentAt !== undefined) {
    meta.push({ label: 'Sent date', value: formatDate(invoice.sentAt) })
  }
  if (invoice.paidAt !== null && invoice.paidAt !== undefined) {
    meta.push({ label: 'Paid date', value: formatDate(invoice.paidAt) })
  }

  return {
    invoice: {
      number: invoice.number,
      status: invoice.status,
      subject: invoice.subject ?? null,
      subtotalAmount: formatMoney(invoice.subtotalAmount, invoice.currency),
      taxAmount: formatMoney(invoice.taxAmount, invoice.currency),
      discountAmount: optionalMoney(invoice.discountAmount, invoice.currency),
      shippingAmount: optionalMoney(invoice.shippingAmount, invoice.currency),
      adjustmentAmount: isZeroAmount(invoice.adjustmentAmount)
        ? null
        : formatMoney(invoice.adjustmentAmount, invoice.currency),
      totalAmount: formatMoney(invoice.totalAmount, invoice.currency),
      amountCredited: optionalMoney(invoice.amountCredited, invoice.currency),
      amountPaid: optionalMoney(invoice.amountPaid, invoice.currency),
      amountDue: formatMoney(invoice.amountDue, invoice.currency),
      notes: invoice.notes ?? null,
      terms: invoice.terms ?? null,
      lines: (invoice.lines ?? []).map((line) =>
        mapLine(line, invoice.currency)
      ),
    },
    recipient: {
      name: invoice.customer?.name ?? invoice.customerId,
      email: null,
      phone: null,
      address: null,
    },
    meta,
  }
}
