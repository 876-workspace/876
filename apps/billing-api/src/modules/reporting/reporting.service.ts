import { dashboardRows } from './reporting.repository'

export async function dashboardOverview(tenantId: string) {
  const rows = await dashboardRows(tenantId)
  const recurring = new Map<string, bigint>()
  for (const subscription of rows.subscriptions) {
    if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) continue
    for (const item of subscription.items) {
      if (item.price.priceType !== 'RECURRING') continue
      const unit = item.unitAmount ?? item.price.unitAmount
      if (unit === null) continue
      const annual = annualAmount(
        unit * BigInt(item.quantity),
        item.price.intervalUnit,
        item.price.intervalCount
      )
      if (annual === null) continue
      const currency = (item.currency ?? item.price.currency).toUpperCase()
      recurring.set(currency, (recurring.get(currency) ?? 0n) + annual)
    }
  }

  const invoiceTotals = new Map<string, { issued: bigint; outstanding: bigint }>()
  for (const invoice of rows.invoices) {
    const currency = invoice.currency.toUpperCase()
    const current = invoiceTotals.get(currency) ?? { issued: 0n, outstanding: 0n }
    current.issued += invoice.totalAmount
    current.outstanding += invoice.amountDue
    invoiceTotals.set(currency, current)
  }

  return {
    object: 'billing_dashboard',
    activeSubscriptions: rows.subscriptions.filter((row) => row.status === 'ACTIVE').length,
    trialingSubscriptions: rows.subscriptions.filter((row) => row.status === 'TRIALING').length,
    pausedSubscriptions: rows.subscriptions.filter((row) => row.status === 'PAUSED').length,
    cancelledSubscriptions: rows.subscriptions.filter((row) => row.status === 'CANCELED').length,
    customerCount: rows.customerCount,
    productCount: rows.productCount,
    recurringRevenue: [...recurring].sort(([left], [right]) => left.localeCompare(right)).map(([currency, arr]) => ({ currency, mrr: (arr / 12n).toString(), arr: arr.toString() })),
    draftQuoteCount: rows.draftQuoteCount,
    issuedInvoiceTotals: [...invoiceTotals].sort(([left], [right]) => left.localeCompare(right)).map(([currency, total]) => ({ currency, totalIssued: total.issued.toString(), totalOutstanding: total.outstanding.toString() })),
  }
}

function annualAmount(
  amount: bigint,
  unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null,
  countValue: number | null
) {
  if (!unit || !countValue || countValue < 1) return null
  const count = BigInt(countValue)
  if (unit === 'DAY') return (amount * 365n) / count
  if (unit === 'WEEK') return (amount * 52n) / count
  if (unit === 'MONTH') return (amount * 12n) / count
  return amount / count
}
