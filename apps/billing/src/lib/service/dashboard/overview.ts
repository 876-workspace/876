import { prisma } from '@/lib/db'
import type { IntervalUnit, SubscriptionStatus } from '@/lib/db'
import type {
  CurrencyMetric,
  InvoiceMetric,
  DashboardOverview,
} from '@/types/dashboard'

/** Returns tenant-scoped commercial metrics without FX conversion. */
export async function overview(tenantId: string): Promise<DashboardOverview> {
  const [
    subscriptions,
    customerCount,
    productCount,
    draftQuoteCount,
    invoices,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: { tenantId },
      include: { items: { include: { price: true } } },
    }),
    prisma.customer.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.quote.count({ where: { tenantId, status: 'DRAFT' } }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        status: {
          in: ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'],
        },
      },
      select: {
        currency: true,
        totalAmount: true,
        amountDue: true,
        status: true,
      },
    }),
  ])

  return {
    activeSubscriptions: subscriptions.filter(
      (subscription) => subscription.status === 'ACTIVE'
    ).length,
    trialingSubscriptions: subscriptions.filter(
      (subscription) => subscription.status === 'TRIALING'
    ).length,
    pausedSubscriptions: subscriptions.filter(
      (subscription) => subscription.status === 'PAUSED'
    ).length,
    cancelledSubscriptions: subscriptions.filter(
      (subscription) => subscription.status === 'CANCELED'
    ).length,
    customerCount,
    productCount,
    recurringRevenue: calculateRecurringRevenue(subscriptions),
    draftQuoteCount,
    issuedInvoiceTotals: groupInvoiceTotals(invoices),
  }
}

type SubscriptionWithPrices = {
  status: SubscriptionStatus
  items: Array<{
    quantity: number
    unitAmount: bigint | null
    currency: string | null
    price: {
      unitAmount: bigint | null
      currency: string
      priceType: 'ONE_TIME' | 'RECURRING'
      intervalUnit: IntervalUnit | null
      intervalCount: number | null
    }
  }>
}

function calculateRecurringRevenue(
  subscriptions: SubscriptionWithPrices[]
): CurrencyMetric[] {
  const arrByCurrency = new Map<string, bigint>()

  for (const subscription of subscriptions) {
    if (
      subscription.status !== 'ACTIVE' &&
      subscription.status !== 'TRIALING'
    ) {
      continue
    }

    for (const item of subscription.items) {
      if (item.price.priceType !== 'RECURRING') continue

      const unitAmount = item.unitAmount ?? item.price.unitAmount
      if (unitAmount === null) continue

      const amount = unitAmount * BigInt(item.quantity)
      const annualAmount = toAnnualAmount(
        amount,
        item.price.intervalUnit,
        item.price.intervalCount
      )
      if (annualAmount === null) continue

      const currency = (item.currency ?? item.price.currency).toUpperCase()
      arrByCurrency.set(
        currency,
        (arrByCurrency.get(currency) ?? 0n) + annualAmount
      )
    }
  }

  return [...arrByCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, arr]) => ({ currency, mrr: arr / 12n, arr }))
}

function groupInvoiceTotals(
  invoices: Array<{
    currency: string
    totalAmount: bigint
    amountDue: bigint
    status: string
  }>
): InvoiceMetric[] {
  const issued = new Map<string, bigint>()
  const outstanding = new Map<string, bigint>()

  for (const invoice of invoices) {
    const currency = invoice.currency.toUpperCase()

    // total issued: include all finalized invoices (OPEN, SENT, PARTIALLY_PAID, OVERDUE, PAID)
    issued.set(currency, (issued.get(currency) ?? 0n) + invoice.totalAmount)

    // total outstanding: sum of amountDue
    outstanding.set(
      currency,
      (outstanding.get(currency) ?? 0n) + invoice.amountDue
    )
  }

  return [...issued.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, totalIssued]) => ({
      currency,
      totalIssued,
      totalOutstanding: outstanding.get(currency) ?? 0n,
    }))
}

function toAnnualAmount(
  amount: bigint,
  intervalUnit: IntervalUnit | null,
  intervalCount: number | null
): bigint | null {
  if (intervalUnit === null || intervalCount === null || intervalCount < 1)
    return null

  const count = BigInt(intervalCount)
  if (intervalUnit === 'DAY') return (amount * 365n) / count
  if (intervalUnit === 'WEEK') return (amount * 52n) / count
  if (intervalUnit === 'MONTH') return (amount * 12n) / count
  return amount / count
}
