import {
  CustomerSalesSummaryPanel,
  CustomerSalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/customer-sales-summary-panel'
import { formatBucketLabel } from '@876/billing-ui/report-range'

import { getInvoiceContext } from '@/lib/auth/context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/clients/billing'

const FALLBACK_TIMEZONE = 'America/Jamaica'
const RANGE_SECONDS = 365 * 86400

function currentTimeSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function CustomerSalesSummaryFallback() {
  return <CustomerSalesSummaryPanelSkeleton />
}

export async function CustomerSalesSummaryData({
  customerId,
}: {
  customerId: string
}) {
  const context = await getInvoiceContext()
  if (!context) return null

  const billing = await getBilling(context.orgId)
  const [accountResult, preferencesResult] = await Promise.all([
    billing.customers.account(customerId),
    billing.reportPreferences.retrieve(),
  ])
  if (accountResult.error)
    return (
      <CustomerSalesSummaryPanel
        state={{ status: 'error', error: accountResult.error }}
      />
    )

  const account = accountResult.data
  if (account.lifetimeSales === '0' && account.lastSaleAt === null)
    return <CustomerSalesSummaryPanel state={{ status: 'empty' }} />

  const now = currentTimeSeconds()
  const salesResult = await billing.reports.salesSummary({
    from: now - RANGE_SECONDS,
    to: now,
    groupBy: 'month',
    customerId,
  })
  const block = salesResult.error
    ? undefined
    : (salesResult.data.currencies.find(
        (entry) => entry.currency === account.currency
      ) ?? salesResult.data.currencies[0])
  const currency = account.currency ?? block?.currency ?? 'JMD'
  const timeZone = preferencesResult.error
    ? FALLBACK_TIMEZONE
    : preferencesResult.data.timezone
  const money = (amount: string) =>
    account.currency
      ? formatMoney(amount, account.currency)
      : `${amount} minor units`

  return (
    <CustomerSalesSummaryPanel
      state={{
        status: 'ready',
        data: {
          lifetimeSalesDisplay: money(account.lifetimeSales),
          lifetimeCreditsDisplay: money(account.lifetimeCredits),
          lastSaleDisplay: formatDate(account.lastSaleAt),
          rangeSalesDisplay: block
            ? formatMoney(block.totals.netSales.totalAmount, block.currency)
            : '—',
          activeSubscriptionCount: null,
          subscriptionMrrDisplay: null,
          monthlyBuckets: (block?.buckets ?? []).map((bucket) => ({
            key: String(bucket.start),
            label: formatBucketLabel(bucket.start, 'month', timeZone),
            valueLabel: formatMoney(bucket.netSales.totalAmount, currency),
            rawValue: bucket.netSales.totalAmount,
          })),
        },
      }}
    />
  )
}
