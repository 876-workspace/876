import {
  CashSummaryPanel,
  CashSummaryPanelSkeleton,
} from '@876/billing-ui/panels/cash-summary-panel'
import {
  ItemSalesPanel,
  ItemSalesPanelSkeleton,
} from '@876/billing-ui/panels/item-sales-panel'
import {
  ReceivablesAgingPanel,
  ReceivablesAgingPanelSkeleton,
} from '@876/billing-ui/panels/receivables-aging-panel'
import {
  SalesSummaryPanel,
  SalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/sales-summary-panel'
import {
  SubscriptionSummaryPanel,
  SubscriptionSummaryPanelSkeleton,
} from '@876/billing-ui/panels/subscription-summary-panel'
import { formatBucketLabel } from '@876/billing-ui/report-range'

import { formatMoney } from '@/lib/format'

import {
  getReportContext,
  nowSeconds,
} from '../_lib/report-context'
import {
  resolveReportPageParams,
  type RawReportSearchParams,
} from '../_lib/report-params'
import { ReportRangeControl } from './report-range-control'

type SearchParamsProp = {
  searchParams: Promise<RawReportSearchParams>
}

function toPanelError(error: { code: string; message: string }) {
  return { code: error.code, message: error.message }
}

function formatChurnRate(rate: string | null): string | null {
  if (rate === null) return null
  const percent = Number(rate) * 100
  if (!Number.isFinite(percent)) return null
  return `${percent.toFixed(2).replace(/\.?0+$/, '')}%`
}

export function ReportControlFallback() {
  return (
    <div className="flex gap-2" aria-label="Loading date range">
      {['Today', 'This week', 'This month'].map((label) => (
        <span
          key={label}
          className="bg-muted h-8 w-24 animate-pulse rounded-md"
        />
      ))}
    </div>
  )
}

export async function ReportRangeControlData({
  searchParams,
}: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const now = nowSeconds()
  const current = resolveReportPageParams(raw, context.timeZone, now)
  return (
    <ReportRangeControl
      timeZone={context.timeZone}
      now={now}
      current={current}
    />
  )
}

export async function SalesSummaryData({ searchParams }: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const params = resolveReportPageParams(raw, context.timeZone, nowSeconds())
  const result = await context.billing.reports.salesSummary({
    from: params.from,
    to: params.to,
    groupBy: params.groupBy,
  })
  if (result.error)
    return <SalesSummaryPanel state={{ status: 'error', error: toPanelError(result.error) }} />
  if (result.data.currencies.length === 0)
    return <SalesSummaryPanel state={{ status: 'empty' }} />
  return (
    <SalesSummaryPanel
      state={{
        status: 'ready',
        data: {
          blocks: result.data.currencies.map((block) => ({
            currency: block.currency,
            subscriptionDisplay: formatMoney(
              block.totals.invoices.bySource.subscription.totalAmount,
              block.currency
            ),
            recurringDisplay: formatMoney(
              block.totals.invoices.bySource.recurringInvoice.totalAmount,
              block.currency
            ),
            oneOffDisplay: formatMoney(
              block.totals.invoices.bySource.oneOff.totalAmount,
              block.currency
            ),
            salesReceiptsDisplay: formatMoney(
              block.totals.salesReceipts.totalAmount,
              block.currency
            ),
            creditNotesDisplay: formatMoney(
              block.totals.creditNotes.totalAmount,
              block.currency
            ),
            netSalesDisplay: formatMoney(
              block.totals.netSales.totalAmount,
              block.currency
            ),
            buckets: block.buckets.map((bucket) => ({
              key: String(bucket.start),
              start: bucket.start,
              end: bucket.end,
              label: formatBucketLabel(
                bucket.start,
                params.groupBy,
                context.timeZone
              ),
              valueLabel: formatMoney(
                bucket.netSales.totalAmount,
                block.currency
              ),
              rawValue: bucket.netSales.totalAmount,
            })),
          })),
        },
      }}
    />
  )
}

export function SalesSummaryFallback() {
  return <SalesSummaryPanelSkeleton />
}

export async function CashSummaryData({ searchParams }: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const params = resolveReportPageParams(raw, context.timeZone, nowSeconds())
  const result = await context.billing.reports.cashSummary({
    from: params.from,
    to: params.to,
    groupBy: params.groupBy,
  })
  if (result.error)
    return <CashSummaryPanel state={{ status: 'error', error: toPanelError(result.error) }} />
  if (result.data.currencies.length === 0)
    return <CashSummaryPanel state={{ status: 'empty' }} />
  return (
    <CashSummaryPanel
      state={{
        status: 'ready',
        data: {
          blocks: result.data.currencies.map((block) => ({
            currency: block.currency,
            paymentsDisplay: formatMoney(
              block.totals.payments.amount,
              block.currency
            ),
            salesReceiptsDisplay: formatMoney(
              block.totals.salesReceipts.amount,
              block.currency
            ),
            refundsDisplay: formatMoney(
              block.totals.refunds.amount,
              block.currency
            ),
            netCashDisplay: formatMoney(block.totals.netCash, block.currency),
            buckets: block.buckets.map((bucket) => ({
              key: String(bucket.start),
              start: bucket.start,
              end: bucket.end,
              label: formatBucketLabel(
                bucket.start,
                params.groupBy,
                context.timeZone
              ),
              valueLabel: formatMoney(bucket.netCash, block.currency),
              rawValue: bucket.netCash,
            })),
          })),
        },
      }}
    />
  )
}

export function CashSummaryFallback() {
  return <CashSummaryPanelSkeleton />
}

const AGING_BUCKETS = [
  'current',
  'days1To30',
  'days31To60',
  'days61To90',
  'over90',
] as const

export async function ReceivablesAgingData({
  searchParams,
}: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const params = resolveReportPageParams(raw, context.timeZone, nowSeconds())
  const result = await context.billing.reports.receivablesAging({
    asOf: params.to,
  })
  if (result.error)
    return (
      <ReceivablesAgingPanel
        state={{ status: 'error', error: toPanelError(result.error) }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
  if (result.data.currencies.length === 0)
    return (
      <ReceivablesAgingPanel
        state={{ status: 'empty' }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
  return (
    <ReceivablesAgingPanel
      state={{
        status: 'ready',
        data: {
          blocks: result.data.currencies.map((block) => ({
            currency: block.currency,
            currentDisplay: formatMoney(block.buckets.current, block.currency),
            days1To30Display: formatMoney(block.buckets.days1To30, block.currency),
            days31To60Display: formatMoney(block.buckets.days31To60, block.currency),
            days61To90Display: formatMoney(block.buckets.days61To90, block.currency),
            over90Display: formatMoney(block.buckets.over90, block.currency),
            totalOutstandingDisplay: formatMoney(
              block.totalOutstanding,
              block.currency
            ),
            totalOverdueDisplay: formatMoney(block.totalOverdue, block.currency),
            bucketBars: AGING_BUCKETS.map((bucket) => ({
              key: bucket,
              bucket,
              label: bucket,
              valueLabel: formatMoney(block.buckets[bucket], block.currency),
              rawValue: block.buckets[bucket],
            })),
            topCustomers: block.topCustomers.map((customer) => ({
              customerId: customer.customerId,
              customerName: customer.customerName,
              outstandingDisplay: formatMoney(
                customer.outstanding,
                block.currency
              ),
            })),
          })),
        },
      }}
      customerHref={(id) => `/customers/${id}`}
    />
  )
}

export function ReceivablesAgingFallback() {
  return <ReceivablesAgingPanelSkeleton />
}

export async function TopItemsData({ searchParams }: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const params = resolveReportPageParams(raw, context.timeZone, nowSeconds())
  const result = await context.billing.reports.itemSales({
    from: params.from,
    to: params.to,
    limit: 10,
  })
  if (result.error)
    return (
      <ItemSalesPanel
        state={{ status: 'error', error: toPanelError(result.error) }}
        itemHref={(id) => `/items/${id}`}
      />
    )
  if (result.data.items.length === 0)
    return (
      <ItemSalesPanel
        state={{ status: 'empty' }}
        itemHref={(id) => `/items/${id}`}
      />
    )
  return (
    <ItemSalesPanel
      state={{
        status: 'ready',
        data: {
          rows: result.data.items.map((row) => ({
            itemId: row.itemId,
            variantId: row.variantId,
            itemName: null,
            currency: row.currency,
            quantitySold: row.quantitySold,
            quantityReturned: row.quantityReturned,
            netDisplay: formatMoney(row.netAmount, row.currency),
            documentCount: row.documentCount,
          })),
        },
      }}
      itemHref={(id) => `/items/${id}`}
    />
  )
}

export function TopItemsFallback() {
  return <ItemSalesPanelSkeleton />
}

export async function SubscriptionSummaryData({
  searchParams,
}: SearchParamsProp) {
  const context = await getReportContext()
  if (!context) return null
  const raw = await searchParams
  const params = resolveReportPageParams(raw, context.timeZone, nowSeconds())
  const result = await context.billing.reports.subscriptionSummary({
    from: params.from,
    to: params.to,
    groupBy: params.groupBy,
  })
  if (result.error)
    return (
      <SubscriptionSummaryPanel
        state={{ status: 'error', error: toPanelError(result.error) }}
      />
    )
  if (result.data.currencies.length === 0)
    return <SubscriptionSummaryPanel state={{ status: 'empty' }} />
  return (
    <SubscriptionSummaryPanel
      state={{
        status: 'ready',
        data: {
          blocks: result.data.currencies.map((block) => ({
            currency: block.currency,
            active: block.current.active,
            trialing: block.current.trialing,
            paused: block.current.paused,
            mrrDisplay: formatMoney(block.current.mrr, block.currency),
            arrDisplay: formatMoney(block.current.arr, block.currency),
            churnDisplay: formatChurnRate(block.churnRate),
            maxBucketCount: block.buckets.reduce(
              (max, bucket) => Math.max(max, bucket.new, bucket.canceled),
              0
            ),
            buckets: block.buckets.map((bucket) => ({
              start: bucket.start,
              end: bucket.end,
              label: formatBucketLabel(
                bucket.start,
                params.groupBy,
                context.timeZone
              ),
              newCount: bucket.new,
              canceledCount: bucket.canceled,
            })),
          })),
        },
      }}
    />
  )
}

export function SubscriptionSummaryFallback() {
  return <SubscriptionSummaryPanelSkeleton />
}
