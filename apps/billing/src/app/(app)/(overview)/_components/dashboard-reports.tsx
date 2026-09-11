import {
  SalesSummaryPanel,
  SalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/sales-summary-panel'
import {
  formatBucketLabel,
  resolveReportPreset,
} from '@876/billing-ui/report-range'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'

import { MetricCard } from './dashboard-metric-card'

const FALLBACK_TIMEZONE = 'America/Jamaica'

function currentTimeSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

async function getDashboardReports() {
  const context = await getWorkspaceContext()
  if (!context) return null
  const billing = await getBilling()
  const preferences = await billing.reportPreferences.retrieve()
  return {
    billing,
    timeZone: preferences.error ? FALLBACK_TIMEZONE : preferences.data.timezone,
  }
}

function joinCurrencyAmounts(
  blocks: Array<{ currency: string; amount: string }>
): string {
  if (blocks.length === 0) return '—'
  return blocks
    .map((block) => formatMoney(block.amount, block.currency))
    .join(' · ')
}

export async function DashboardSalesMonthData() {
  const reports = await getDashboardReports()
  if (!reports) return null
  const now = currentTimeSeconds()
  const month = resolveReportPreset('this-month', reports.timeZone, now)
  const result = await reports.billing.reports.salesSummary({
    from: month.from,
    to: now,
    groupBy: 'day',
  })
  if (result.error)
    return (
      <MetricCard
        label="Sales this month"
        value="—"
        color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />
    )
  return (
    <MetricCard
      label="Sales this month"
      value={joinCurrencyAmounts(
        result.data.currencies.map((block) => ({
          currency: block.currency,
          amount: block.totals.netSales.totalAmount,
        }))
      )}
      color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
    />
  )
}

export async function DashboardOverdueData() {
  const reports = await getDashboardReports()
  if (!reports) return null
  const result = await reports.billing.reports.receivablesAging({})
  if (result.error)
    return (
      <MetricCard
        label="Overdue receivables"
        value="—"
        color="bg-rose-500/10 text-rose-600 dark:text-rose-400"
      />
    )
  return (
    <MetricCard
      label="Overdue receivables"
      value={joinCurrencyAmounts(
        result.data.currencies.map((block) => ({
          currency: block.currency,
          amount: block.totalOverdue,
        }))
      )}
      color="bg-rose-500/10 text-rose-600 dark:text-rose-400"
    />
  )
}

export async function DashboardCompactSalesData() {
  const reports = await getDashboardReports()
  if (!reports) return null
  const now = currentTimeSeconds()
  const result = await reports.billing.reports.salesSummary({
    from: now - 30 * 86400,
    to: now,
    groupBy: 'day',
  })
  if (result.error)
    return (
      <SalesSummaryPanel
        state={{
          status: 'error',
          error: { code: result.error.code, message: result.error.message },
        }}
      />
    )
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
              label: formatBucketLabel(bucket.start, 'day', reports.timeZone),
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

export function DashboardCompactSalesFallback() {
  return <SalesSummaryPanelSkeleton />
}
