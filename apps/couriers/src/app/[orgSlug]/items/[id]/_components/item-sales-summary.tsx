import {
  ItemSalesSummaryPanel,
  ItemSalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/item-sales-summary-panel'
import { formatBucketLabel } from '@876/billing-ui/report-range'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'
import { formatMoney } from '@/lib/finance/format'

export function ItemSalesSummaryFallback() {
  return <ItemSalesSummaryPanelSkeleton />
}

export async function ItemSalesSummaryData({
  orgSlug,
  itemId,
}: {
  orgSlug: string
  itemId: string
}) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const summaryResult = await billingIntegration.items.salesSummary(
    ctx.orgId,
    itemId
  )
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
            label: formatBucketLabel(bucket.start, 'month', summary.timezone),
            valueLabel: formatMoney(bucket.netAmount, currency),
            rawValue: bucket.netAmount,
          })),
        },
      }}
    />
  )
}
