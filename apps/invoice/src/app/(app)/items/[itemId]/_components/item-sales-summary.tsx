import {
  ItemSalesSummaryPanel,
  ItemSalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/item-sales-summary-panel'
import { formatBucketLabel } from '@876/billing-ui/report-range'

import { getInvoiceContext } from '@/lib/auth/context'
import { formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'

const FALLBACK_TIMEZONE = 'America/Jamaica'

export function ItemSalesSummaryFallback() {
  return <ItemSalesSummaryPanelSkeleton />
}

export async function ItemSalesSummaryData({ itemId }: { itemId: string }) {
  const context = await getInvoiceContext()
  if (!context) return null

  const billing = await getBilling(context.orgId)
  const [summaryResult, preferencesResult] = await Promise.all([
    billing.items.salesSummary(itemId),
    billing.reportPreferences.retrieve(),
  ])
  if (summaryResult.error)
    return (
      <ItemSalesSummaryPanel
        state={{ status: 'error', error: summaryResult.error }}
      />
    )

  const summary = summaryResult.data
  if (summary.rows.length === 0 && summary.monthlyBuckets.length === 0)
    return <ItemSalesSummaryPanel state={{ status: 'empty' }} />

  const currencyNets = new Map<string, bigint>()
  for (const row of summary.rows)
    currencyNets.set(
      row.currency,
      (currencyNets.get(row.currency) ?? 0n) + BigInt(row.netAmount)
    )
  const bucketSet = summary.monthlyBuckets[0]
  const currency = bucketSet?.currency ?? summary.rows[0]?.currency ?? 'JMD'
  const timeZone = preferencesResult.error
    ? FALLBACK_TIMEZONE
    : preferencesResult.data.timezone

  return (
    <ItemSalesSummaryPanel
      state={{
        status: 'ready',
        data: {
          quantitySold: summary.rows.reduce(
            (total, row) => total + row.quantitySold,
            0
          ),
          quantityReturned: summary.rows.reduce(
            (total, row) => total + row.quantityReturned,
            0
          ),
          netDisplay: [...currencyNets]
            .map(([rowCurrency, net]) =>
              formatMoney(net.toString(), rowCurrency)
            )
            .join(' · '),
          monthlyBuckets: (bucketSet?.buckets ?? []).map((bucket) => ({
            key: String(bucket.start),
            label: formatBucketLabel(bucket.start, 'month', timeZone),
            valueLabel: formatMoney(bucket.netAmount, currency),
            rawValue: bucket.netAmount,
          })),
        },
      }}
    />
  )
}
