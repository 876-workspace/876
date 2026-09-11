import type { RecurringInvoice, RecurringInvoiceLine } from '@/db'

const apiStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  EXPIRED: 'expired',
} as const
const apiMode = {
  DRAFT: 'draft',
  FINALIZE: 'finalize',
  FINALIZE_AND_SEND: 'finalize-and-send',
} as const
const apiUnit = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
} as const

export type RecurringInvoiceRow = RecurringInvoice & {
  lines: RecurringInvoiceLine[]
}

export function serializeRecurringInvoice(row: RecurringInvoiceRow) {
  return {
    id: row.id,
    object: 'recurring-invoice' as const,
    profileName: row.profileName,
    customerId: row.customerId,
    currency: row.currency,
    status: apiStatus[row.status],
    frequency: {
      intervalUnit: apiUnit[row.intervalUnit],
      intervalCount: row.intervalCount,
    },
    startAt: row.startAt,
    endAt: row.endAt,
    maxCycles: row.maxCycles,
    nextRunAt: row.nextRunAt,
    lastRunAt: row.lastRunAt,
    generatedCount: row.generatedCount,
    generationMode: apiMode[row.generationMode],
    paymentTermId: row.paymentTermId,
    salespersonId: row.salespersonId,
    priceListId: row.priceListId,
    taxBehavior: row.taxBehavior,
    notes: row.notes,
    terms: row.terms,
    lines: row.lines
      .toSorted((left, right) => left.position - right.position)
      .map((line) => ({
        itemId: line.itemId,
        variantId: line.variantId,
        priceId: line.priceId,
        description: line.description,
        quantity: line.quantity,
        unitAmount: line.unitAmount?.toString() ?? null,
        taxAmount: line.taxAmount.toString(),
        discountAmount: line.discountAmount.toString(),
      })),
    subtotalAmount: row.subtotalAmount.toString(),
    discountAmount: row.discountAmount.toString(),
    taxAmount: row.taxAmount.toString(),
    totalAmount: row.totalAmount.toString(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
