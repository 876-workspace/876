import type { Invoice } from '@876/billing'

/**
 * The Billing invoice resource is a passthrough shape — the API guarantees only
 * `object` and `id`, so every other field is read defensively here rather than
 * cast away at the call site.
 */
export type InvoiceRow = {
  id: string
  number: string
  status: string
  currency: string | null
  /** Minor units, carried as a string because the API serializes BigInt. */
  totalAmount: string | null
  customerName: string | null
  /** Unix seconds. */
  dueAt: number | null
}

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' || typeof value === 'bigint')
    return String(value)
  return null
}

function seconds(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Narrows one passthrough Billing invoice to the fields the table renders. */
export function toInvoiceRow(invoice: Invoice): InvoiceRow {
  return {
    id: invoice.id,
    number: text(invoice.number) ?? invoice.id,
    status: text(invoice.status) ?? 'unknown',
    currency: text(invoice.currency),
    totalAmount: text(invoice.totalAmount),
    customerName: text(invoice.customerName),
    dueAt: seconds(invoice.dueAt),
  }
}

/** Formats a minor-unit amount for display; returns an em dash when absent. */
export function formatAmount(
  amount: string | null,
  currency: string | null
): string {
  if (amount === null) return '—'

  const minor = Number(amount)
  if (!Number.isFinite(minor)) return '—'

  const major = minor / 100
  if (!currency) return major.toFixed(2)

  try {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency,
    }).format(major)
  } catch {
    return `${currency} ${major.toFixed(2)}`
  }
}

/** Formats a Unix-seconds timestamp as a short date; em dash when absent. */
export function formatDate(seconds: number | null): string {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleDateString('en-JM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
