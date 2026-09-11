import { nowUnixSeconds } from '@876/core/timestamps'

import { errors } from '@/http/errors'

import { MAX_REPORT_RANGE_DAYS } from './reporting.schemas'
import type {
  CashSummaryQuery,
  CustomerSalesQuery,
  ItemSalesQuery,
  ItemSalesSummaryQuery,
  ReceivablesAgingQuery,
  ReportPreferencesUpdate,
  ReportRangeQuery,
  SubscriptionSummaryQuery,
} from './reporting.schemas'
import {
  activeSubscriptionCount,
  activeSubscriptionsAt,
  bucketSpine,
  creditNoteRows,
  currentMrrByCurrency,
  customerLastSaleAt,
  customerSalesRows,
  dashboardCounts,
  invoiceSalesRows,
  invoiceTotalsByCurrency,
  itemBucketRows,
  itemSalesRows,
  monthStartEpoch,
  paymentCashRows,
  receivablesAgingRows,
  receivablesOverdueByCurrency,
  receivablesTopCustomers,
  refundRows,
  salesReceiptRows,
  subscriptionEventRows,
  subscriptionStatusCounts,
  type Bucket,
  type ReportGroupBy,
} from './reporting.repository'
import {
  REPORT_FISCAL_YEAR_START_MONTH_DEFAULT,
  REPORT_TIMEZONE_DEFAULT,
  retrieveReportPreferences,
  updateReportPreferences,
  type ReportPreferences,
} from './report-preferences.repository'

const MAX_RANGE_SECONDS = MAX_REPORT_RANGE_DAYS * 86400
const DEFAULT_ITEM_RANGE_DAYS = 365

const SUBSCRIPTION_BILLING_REASONS = new Set([
  'SUBSCRIPTION_CREATE',
  'SUBSCRIPTION_CYCLE',
  'SUBSCRIPTION_UPDATE',
])

type InvoiceSource = 'subscription' | 'recurringInvoice' | 'oneOff'

function invoiceSource(reason: string): InvoiceSource {
  if (reason === 'RECURRING_INVOICE') return 'recurringInvoice'
  if (SUBSCRIPTION_BILLING_REASONS.has(reason)) return 'subscription'
  return 'oneOff'
}

function addMoney(left: string, right: string): string {
  return (BigInt(left) + BigInt(right)).toString()
}

function subtractMoney(left: string, right: string): string {
  return (BigInt(left) - BigInt(right)).toString()
}

function assertReportRange(from: number, to: number): void {
  if (from >= to)
    throw errors.validation('The report range start must be before its end.', {
      param: 'from',
    })
  if (to - from > MAX_RANGE_SECONDS)
    throw errors.validation(
      `The report range must not exceed ${MAX_REPORT_RANGE_DAYS} days.`,
      { param: 'to' }
    )
}

type MoneyTotals = {
  count: number
  netAmount: string
  taxAmount: string
  totalAmount: string
}

function zeroTotals(): MoneyTotals {
  return { count: 0, netAmount: '0', taxAmount: '0', totalAmount: '0' }
}

function zeroSourceSplit(): Record<InvoiceSource, MoneyTotals> {
  return {
    subscription: zeroTotals(),
    recurringInvoice: zeroTotals(),
    oneOff: zeroTotals(),
  }
}

export async function getReportPreferences(
  tenantId: string
): Promise<ReportPreferences> {
  return retrieveReportPreferences(tenantId)
}

export async function updateReportPreferencesForTenant(
  tenantId: string,
  input: ReportPreferencesUpdate,
  updatedBy?: string
): Promise<ReportPreferences> {
  return updateReportPreferences(tenantId, input, updatedBy)
}

export async function salesSummary(tenantId: string, query: ReportRangeQuery) {
  assertReportRange(query.from, query.to)
  const preferences = await retrieveReportPreferences(tenantId)
  const groupBy = query.groupBy
  const filter = {
    from: query.from,
    to: query.to,
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.itemId ? { itemId: query.itemId } : {}),
  }
  const [spine, invoices, receipts, credits] = await Promise.all([
    bucketSpine(groupBy, query.from, query.to, preferences.timezone),
    invoiceSalesRows(tenantId, filter, groupBy, preferences.timezone),
    salesReceiptRows(tenantId, filter, groupBy, preferences.timezone),
    creditNoteRows(tenantId, filter, groupBy, preferences.timezone),
  ])

  const currencies = [
    ...new Set([
      ...invoices.map((row) => row.currency),
      ...receipts.map((row) => row.currency),
      ...credits.map((row) => row.currency),
    ]),
  ].sort()

  return {
    object: 'sales-summary' as const,
    timezone: preferences.timezone,
    fiscalYearStartMonth: preferences.fiscalYearStartMonth,
    from: query.from,
    to: query.to,
    groupBy,
    currencies: currencies.map((currency) => {
      const totals = {
        invoices: zeroTotals(),
        salesReceipts: zeroTotals(),
        creditNotes: zeroTotals(),
        bySource: zeroSourceSplit(),
      }
      for (const row of invoices) {
        if (row.currency !== currency) continue
        const target = totals.bySource[invoiceSource(row.billingReason)]
        totals.invoices.count += row.count
        totals.invoices.netAmount = addMoney(
          totals.invoices.netAmount,
          row.netAmount
        )
        totals.invoices.taxAmount = addMoney(
          totals.invoices.taxAmount,
          row.taxAmount
        )
        totals.invoices.totalAmount = addMoney(
          totals.invoices.totalAmount,
          row.totalAmount
        )
        target.count += row.count
        target.netAmount = addMoney(target.netAmount, row.netAmount)
        target.taxAmount = addMoney(target.taxAmount, row.taxAmount)
        target.totalAmount = addMoney(target.totalAmount, row.totalAmount)
      }
      for (const row of receipts) {
        if (row.currency !== currency) continue
        totals.salesReceipts.count += row.count
        totals.salesReceipts.netAmount = addMoney(
          totals.salesReceipts.netAmount,
          row.netAmount
        )
        totals.salesReceipts.taxAmount = addMoney(
          totals.salesReceipts.taxAmount,
          row.taxAmount
        )
        totals.salesReceipts.totalAmount = addMoney(
          totals.salesReceipts.totalAmount,
          row.totalAmount
        )
      }
      for (const row of credits) {
        if (row.currency !== currency) continue
        totals.creditNotes.count += row.count
        totals.creditNotes.netAmount = addMoney(
          totals.creditNotes.netAmount,
          row.netAmount
        )
        totals.creditNotes.taxAmount = addMoney(
          totals.creditNotes.taxAmount,
          row.taxAmount
        )
        totals.creditNotes.totalAmount = addMoney(
          totals.creditNotes.totalAmount,
          row.totalAmount
        )
      }

      const buckets = spine.map((bucket) => {
        const bucketInvoices = zeroTotals()
        const bucketSources = zeroSourceSplit()
        const bucketReceipts = zeroTotals()
        const bucketCredits = zeroTotals()
        for (const row of invoices) {
          if (row.currency !== currency || row.bucketStart !== bucket.start)
            continue
          const target = bucketSources[invoiceSource(row.billingReason)]
          bucketInvoices.count += row.count
          bucketInvoices.netAmount = addMoney(
            bucketInvoices.netAmount,
            row.netAmount
          )
          bucketInvoices.taxAmount = addMoney(
            bucketInvoices.taxAmount,
            row.taxAmount
          )
          bucketInvoices.totalAmount = addMoney(
            bucketInvoices.totalAmount,
            row.totalAmount
          )
          target.count += row.count
          target.netAmount = addMoney(target.netAmount, row.netAmount)
          target.taxAmount = addMoney(target.taxAmount, row.taxAmount)
          target.totalAmount = addMoney(target.totalAmount, row.totalAmount)
        }
        for (const row of receipts) {
          if (row.currency !== currency || row.bucketStart !== bucket.start)
            continue
          bucketReceipts.count += row.count
          bucketReceipts.netAmount = addMoney(
            bucketReceipts.netAmount,
            row.netAmount
          )
          bucketReceipts.taxAmount = addMoney(
            bucketReceipts.taxAmount,
            row.taxAmount
          )
          bucketReceipts.totalAmount = addMoney(
            bucketReceipts.totalAmount,
            row.totalAmount
          )
        }
        for (const row of credits) {
          if (row.currency !== currency || row.bucketStart !== bucket.start)
            continue
          bucketCredits.count += row.count
          bucketCredits.netAmount = addMoney(
            bucketCredits.netAmount,
            row.netAmount
          )
          bucketCredits.taxAmount = addMoney(
            bucketCredits.taxAmount,
            row.taxAmount
          )
          bucketCredits.totalAmount = addMoney(
            bucketCredits.totalAmount,
            row.totalAmount
          )
        }
        const grossNet = addMoney(
          bucketInvoices.netAmount,
          bucketReceipts.netAmount
        )
        const grossTax = addMoney(
          bucketInvoices.taxAmount,
          bucketReceipts.taxAmount
        )
        const grossTotal = addMoney(
          bucketInvoices.totalAmount,
          bucketReceipts.totalAmount
        )
        return {
          start: bucket.start,
          end: bucket.end,
          invoices: { ...bucketInvoices, bySource: bucketSources },
          salesReceipts: bucketReceipts,
          creditNotes: bucketCredits,
          netSales: {
            netAmount: subtractMoney(grossNet, bucketCredits.netAmount),
            taxAmount: subtractMoney(grossTax, bucketCredits.taxAmount),
            totalAmount: subtractMoney(grossTotal, bucketCredits.totalAmount),
          },
        }
      })

      const grossNet = addMoney(
        totals.invoices.netAmount,
        totals.salesReceipts.netAmount
      )
      const grossTax = addMoney(
        totals.invoices.taxAmount,
        totals.salesReceipts.taxAmount
      )
      const grossTotal = addMoney(
        totals.invoices.totalAmount,
        totals.salesReceipts.totalAmount
      )
      return {
        currency,
        totals: {
          invoices: { ...totals.invoices, bySource: totals.bySource },
          salesReceipts: totals.salesReceipts,
          creditNotes: totals.creditNotes,
          netSales: {
            netAmount: subtractMoney(grossNet, totals.creditNotes.netAmount),
            taxAmount: subtractMoney(grossTax, totals.creditNotes.taxAmount),
            totalAmount: subtractMoney(
              grossTotal,
              totals.creditNotes.totalAmount
            ),
          },
        },
        buckets,
      }
    }),
  }
}

export async function cashSummary(tenantId: string, query: CashSummaryQuery) {
  assertReportRange(query.from, query.to)
  const preferences = await retrieveReportPreferences(tenantId)
  const groupBy = query.groupBy
  const filter = {
    from: query.from,
    to: query.to,
    ...(query.customerId ? { customerId: query.customerId } : {}),
  }
  const [spine, payments, refunds] = await Promise.all([
    bucketSpine(groupBy, query.from, query.to, preferences.timezone),
    paymentCashRows(tenantId, filter, groupBy, preferences.timezone),
    refundRows(tenantId, filter, groupBy, preferences.timezone),
  ])

  const currencies = [
    ...new Set([
      ...payments.map((row) => row.currency),
      ...refunds.map((row) => row.currency),
    ]),
  ].sort()

  return {
    object: 'cash-summary' as const,
    timezone: preferences.timezone,
    fiscalYearStartMonth: preferences.fiscalYearStartMonth,
    from: query.from,
    to: query.to,
    groupBy,
    currencies: currencies.map((currency) => {
      const totals = {
        payments: { count: 0, amount: '0' },
        salesReceipts: { count: 0, amount: '0' },
        refunds: { count: 0, amount: '0' },
      }
      for (const row of payments) {
        if (row.currency !== currency) continue
        const target = row.isSalesReceiptCash
          ? totals.salesReceipts
          : totals.payments
        target.count += row.count
        target.amount = addMoney(target.amount, row.amount)
      }
      for (const row of refunds) {
        if (row.currency !== currency) continue
        totals.refunds.count += row.count
        totals.refunds.amount = addMoney(totals.refunds.amount, row.amount)
      }

      const buckets = spine.map((bucket) => {
        const bucketPayments = { count: 0, amount: '0' }
        const bucketReceipts = { count: 0, amount: '0' }
        const bucketRefunds = { count: 0, amount: '0' }
        for (const row of payments) {
          if (row.currency !== currency || row.bucketStart !== bucket.start)
            continue
          const target = row.isSalesReceiptCash
            ? bucketReceipts
            : bucketPayments
          target.count += row.count
          target.amount = addMoney(target.amount, row.amount)
        }
        for (const row of refunds) {
          if (row.currency !== currency || row.bucketStart !== bucket.start)
            continue
          bucketRefunds.count += row.count
          bucketRefunds.amount = addMoney(bucketRefunds.amount, row.amount)
        }
        return {
          start: bucket.start,
          end: bucket.end,
          payments: bucketPayments,
          salesReceipts: bucketReceipts,
          refunds: bucketRefunds,
          netCash: subtractMoney(
            addMoney(bucketPayments.amount, bucketReceipts.amount),
            bucketRefunds.amount
          ),
        }
      })

      return {
        currency,
        totals: {
          ...totals,
          netCash: subtractMoney(
            addMoney(totals.payments.amount, totals.salesReceipts.amount),
            totals.refunds.amount
          ),
        },
        buckets,
      }
    }),
  }
}

export async function receivablesAging(
  tenantId: string,
  query: ReceivablesAgingQuery
) {
  const preferences = await retrieveReportPreferences(tenantId)
  const asOf = query.asOf ?? nowUnixSeconds()
  const [rows, topCustomers] = await Promise.all([
    receivablesAgingRows(tenantId, asOf, query.customerId),
    receivablesTopCustomers(tenantId, query.limit, query.customerId),
  ])

  return {
    object: 'receivables-aging' as const,
    timezone: preferences.timezone,
    asOf,
    currencies: rows
      .slice()
      .sort((left, right) => left.currency.localeCompare(right.currency))
      .map((row) => ({
        currency: row.currency,
        buckets: {
          current: row.current,
          days1To30: row.days1To30,
          days31To60: row.days31To60,
          days61To90: row.days61To90,
          over90: row.over90,
        },
        totalOutstanding: row.totalOutstanding,
        totalOverdue: subtractMoney(row.totalOutstanding, row.current),
        topCustomers: topCustomers
          .filter((customer) => customer.currency === row.currency)
          .slice(0, query.limit)
          .map((customer) => ({
            customerId: customer.customerId,
            customerName: customer.customerName,
            outstanding: customer.outstanding,
          })),
      })),
  }
}

export async function itemSales(tenantId: string, query: ItemSalesQuery) {
  assertReportRange(query.from, query.to)
  const preferences = await retrieveReportPreferences(tenantId)
  const rows = await itemSalesRows(
    tenantId,
    {
      from: query.from,
      to: query.to,
      ...(query.itemId ? { itemId: query.itemId } : {}),
    },
    query.limit
  )

  return {
    object: 'item-sales' as const,
    timezone: preferences.timezone,
    from: query.from,
    to: query.to,
    limit: query.limit,
    items: rows.map((row) => ({
      itemId: row.itemId,
      variantId: row.variantId,
      currency: row.currency,
      quantitySold: row.quantitySold,
      quantityReturned: row.quantityReturned,
      netAmount: row.netAmount,
      documentCount: row.documentCount,
    })),
  }
}

export async function itemSalesSummary(
  tenantId: string,
  itemId: string,
  query: ItemSalesSummaryQuery
) {
  const to = query.to ?? nowUnixSeconds()
  const from = query.from ?? to - DEFAULT_ITEM_RANGE_DAYS * 86400
  assertReportRange(from, to)
  const preferences = await retrieveReportPreferences(tenantId)
  const [rows, spine, bucketed] = await Promise.all([
    itemSalesRows(tenantId, { from, to, itemId }, 100),
    bucketSpine('month', from, to, preferences.timezone),
    itemBucketRows(
      tenantId,
      itemId,
      { from, to },
      'month',
      preferences.timezone
    ),
  ])

  const currencies = [...new Set(bucketed.map((row) => row.currency))].sort()
  return {
    object: 'item-sales-summary' as const,
    timezone: preferences.timezone,
    from,
    to,
    itemId,
    rows: rows.map((row) => ({
      itemId: row.itemId,
      variantId: row.variantId,
      currency: row.currency,
      quantitySold: row.quantitySold,
      quantityReturned: row.quantityReturned,
      netAmount: row.netAmount,
      documentCount: row.documentCount,
    })),
    monthlyBuckets: currencies.map((currency) => ({
      currency,
      buckets: spine.map((bucket) => {
        const match = bucketed.find(
          (row) => row.currency === currency && row.bucketStart === bucket.start
        )
        return {
          start: bucket.start,
          end: bucket.end,
          quantitySold: match?.quantitySold ?? 0,
          quantityReturned: match?.quantityReturned ?? 0,
          netAmount: match?.netAmount ?? '0',
          documentCount: match?.documentCount ?? 0,
        }
      }),
    })),
  }
}

export async function customerSales(
  tenantId: string,
  query: CustomerSalesQuery
) {
  assertReportRange(query.from, query.to)
  const preferences = await retrieveReportPreferences(tenantId)
  const rows = await customerSalesRows(
    tenantId,
    { from: query.from, to: query.to },
    query.limit
  )

  return {
    object: 'customer-sales' as const,
    timezone: preferences.timezone,
    from: query.from,
    to: query.to,
    limit: query.limit,
    customers: rows.map((row) => ({
      customerId: row.customerId,
      customerName: row.customerName,
      currency: row.currency,
      netSales: row.netSales,
      documentCount: row.documentCount,
    })),
  }
}

function churnRate(
  canceledInRange: number,
  activeAtStart: number
): string | null {
  if (activeAtStart === 0) return null
  return String(Number.parseFloat((canceledInRange / activeAtStart).toFixed(6)))
}

export async function subscriptionSummary(
  tenantId: string,
  query: SubscriptionSummaryQuery
) {
  assertReportRange(query.from, query.to)
  const preferences = await retrieveReportPreferences(tenantId)
  const groupBy = query.groupBy
  const filter = {
    from: query.from,
    to: query.to,
    ...(query.customerId ? { customerId: query.customerId } : {}),
  }
  const [spine, events, activeAtStart, mrr, statusCounts, revenue] =
    await Promise.all([
      bucketSpine(groupBy, query.from, query.to, preferences.timezone),
      subscriptionEventRows(tenantId, filter, groupBy, preferences.timezone),
      activeSubscriptionsAt(tenantId, query.from, query.customerId),
      currentMrrByCurrency(tenantId, query.customerId),
      subscriptionStatusCounts(tenantId, query.customerId),
      invoiceSalesRows(tenantId, filter, groupBy, preferences.timezone),
    ])

  const counts = new Map(statusCounts.map((row) => [row.status, row.count]))
  const canceledInRange = events
    .filter((row) => row.event === 'canceled')
    .reduce((total, row) => total + row.count, 0)
  const rate = churnRate(canceledInRange, activeAtStart)

  const currencies = [
    ...new Set([
      ...mrr.map((row) => row.currency),
      ...revenue
        .filter((row) => invoiceSource(row.billingReason) === 'subscription')
        .map((row) => row.currency),
    ]),
  ].sort()

  return {
    object: 'subscription-summary' as const,
    timezone: preferences.timezone,
    from: query.from,
    to: query.to,
    groupBy,
    currencies: currencies.map((currency) => {
      const current = mrr.find((row) => row.currency === currency)
      const buckets = spine.map((bucket) =>
        summarizeSubscriptionBucket(bucket, events, revenue, currency)
      )
      return {
        currency,
        current: {
          active: counts.get('ACTIVE') ?? 0,
          trialing: counts.get('TRIALING') ?? 0,
          paused: counts.get('PAUSED') ?? 0,
          mrr: current?.mrr ?? '0',
          arr: current?.arr ?? '0',
        },
        buckets,
        churnRate: rate,
      }
    }),
  }
}

function summarizeSubscriptionBucket(
  bucket: Bucket,
  events: Array<{ event: string; bucketStart: number; count: number }>,
  revenue: Array<{
    bucketStart: number
    currency: string
    billingReason: string
    netAmount: string
  }>,
  currency: string
) {
  const inBucket = events.filter((row) => row.bucketStart === bucket.start)
  const eventCount = (event: string) =>
    inBucket
      .filter((row) => row.event === event)
      .reduce((total, row) => total + row.count, 0)
  let subscriptionRevenue = '0'
  for (const row of revenue) {
    if (row.currency !== currency || row.bucketStart !== bucket.start) continue
    if (invoiceSource(row.billingReason) !== 'subscription') continue
    subscriptionRevenue = addMoney(subscriptionRevenue, row.netAmount)
  }
  return {
    start: bucket.start,
    end: bucket.end,
    new: eventCount('new'),
    canceled: eventCount('canceled'),
    ended: eventCount('ended'),
    paused: eventCount('paused'),
    subscriptionRevenue,
  }
}

/**
 * Customer lifetime sales over the Sales definition (finalized non-void
 * invoices plus paid sales receipts), the issued credit-note totals, and the
 * latest sale instant, keyed by currency. Currencies are never summed
 * together; the account projection reads the customer's own currency.
 */
export async function customerLifetimeSales(
  tenantId: string,
  customerId: string
): Promise<{
  salesByCurrency: Map<string, string>
  creditsByCurrency: Map<string, string>
  lastSaleAt: number | null
}> {
  const to = nowUnixSeconds()
  const preferences = await retrieveReportPreferences(tenantId)
  const [invoices, receipts, credits, lastSaleAt] = await Promise.all([
    invoiceSalesRows(
      tenantId,
      { from: 0, to, customerId },
      'none',
      preferences.timezone
    ),
    salesReceiptRows(
      tenantId,
      { from: 0, to, customerId },
      'none',
      preferences.timezone
    ),
    creditNoteRows(
      tenantId,
      { from: 0, to, customerId },
      'none',
      preferences.timezone
    ),
    customerLastSaleAt(tenantId, customerId),
  ])

  const salesByCurrency = new Map<string, string>()
  for (const row of [...invoices, ...receipts]) {
    const currency = row.currency.toUpperCase()
    salesByCurrency.set(
      currency,
      addMoney(salesByCurrency.get(currency) ?? '0', row.netAmount)
    )
  }
  const creditsByCurrency = new Map<string, string>()
  for (const row of credits) {
    const currency = row.currency.toUpperCase()
    creditsByCurrency.set(
      currency,
      addMoney(creditsByCurrency.get(currency) ?? '0', row.totalAmount)
    )
  }

  return { salesByCurrency, creditsByCurrency, lastSaleAt }
}

/** Active subscription count plus current MRR per currency for one customer. */
export async function customerSubscriptionSnapshot(
  tenantId: string,
  customerId: string
): Promise<{
  activeSubscriptionCount: number
  mrr: Array<{ currency: string; mrr: string; arr: string }>
}> {
  const [activeSubscriptionCountValue, mrr] = await Promise.all([
    activeSubscriptionCount(tenantId, customerId),
    currentMrrByCurrency(tenantId, customerId),
  ])
  return { activeSubscriptionCount: activeSubscriptionCountValue, mrr }
}

export async function dashboardOverview(tenantId: string) {
  const [counts, statuses, mrr, invoiceTotals, preferences] = await Promise.all(
    [
      dashboardCounts(tenantId),
      subscriptionStatusCounts(tenantId),
      currentMrrByCurrency(tenantId),
      invoiceTotalsByCurrency(tenantId),
      retrieveReportPreferences(tenantId),
    ]
  )
  const now = nowUnixSeconds()
  const [monthStart, overdue] = await Promise.all([
    monthStartEpoch(preferences.timezone, now),
    receivablesOverdueByCurrency(tenantId, now),
  ])
  const [monthInvoices, monthReceipts, monthCredits] = await Promise.all([
    invoiceSalesRows(
      tenantId,
      { from: monthStart, to: now },
      'none',
      preferences.timezone
    ),
    salesReceiptRows(
      tenantId,
      { from: monthStart, to: now },
      'none',
      preferences.timezone
    ),
    creditNoteRows(
      tenantId,
      { from: monthStart, to: now },
      'none',
      preferences.timezone
    ),
  ])

  const monthNet = new Map<string, string>()
  for (const row of [...monthInvoices, ...monthReceipts])
    monthNet.set(
      row.currency,
      addMoney(monthNet.get(row.currency) ?? '0', row.netAmount)
    )
  for (const row of monthCredits)
    monthNet.set(
      row.currency,
      subtractMoney(monthNet.get(row.currency) ?? '0', row.netAmount)
    )

  const statusCount = new Map(statuses.map((row) => [row.status, row.count]))
  const overdueByCurrency = new Map(
    overdue.map((row) => [row.currency, row.overdue])
  )
  const currencies = [
    ...new Set([
      ...invoiceTotals.map((row) => row.currency),
      ...monthNet.keys(),
      ...overdueByCurrency.keys(),
    ]),
  ].sort()

  return {
    object: 'billing_dashboard' as const,
    activeSubscriptions: statusCount.get('ACTIVE') ?? 0,
    trialingSubscriptions: statusCount.get('TRIALING') ?? 0,
    pausedSubscriptions: statusCount.get('PAUSED') ?? 0,
    cancelledSubscriptions: statusCount.get('CANCELED') ?? 0,
    customerCount: counts.customerCount,
    productCount: counts.productCount,
    recurringRevenue: mrr,
    draftQuoteCount: counts.draftQuoteCount,
    issuedInvoiceTotals: invoiceTotals.map((row) => ({
      currency: row.currency,
      totalIssued: row.issued,
      totalOutstanding: row.outstanding,
    })),
    salesThisMonth: currencies.map((currency) => ({
      currency,
      netSales: monthNet.get(currency) ?? '0',
    })),
    receivablesOverdue: currencies.map((currency) => ({
      currency,
      overdue: overdueByCurrency.get(currency) ?? '0',
    })),
  }
}

export { REPORT_FISCAL_YEAR_START_MONTH_DEFAULT, REPORT_TIMEZONE_DEFAULT }
export type { Bucket, ReportGroupBy }
