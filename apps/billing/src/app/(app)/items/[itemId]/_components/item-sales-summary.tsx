import {
  ItemSalesSummaryPanel,
  ItemSalesSummaryPanelSkeleton,
} from '@876/billing-ui/panels/item-sales-summary-panel'
import { formatBucketLabel } from '@876/billing-ui/report-range'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/clients/billing'

const FALLBACK_TIMEZONE = 'America/Jamaica'

export function ItemSalesSummaryFallback() {
  return <ItemSalesSummaryPanelSkeleton />
}

export async function ItemSalesSummaryData({ itemId }: { itemId: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null
  const billing = await getBilling()
  const [summaryResult, preferencesResult] = await Promise.all([
    billing.items.salesSummary(itemId),
    billing.reportPreferences.retrieve(),
  ])
  if (summaryResult.error)
    return (
      <ItemSalesSummaryPanel
        state={{
          status: 'error',
          error: {
            code: summaryResult.error.code,
            message: summaryResult.error.message,
          },
        }}
      />
    )

  const summary = summaryResult.data
  const timeZone = preferencesResult.error
    ? FALLBACK_TIMEZONE
    : preferencesResult.data.timezone
  const quantitySold = summary.rows.reduce(
    (total, row) => total + row.quantitySold,
    0
  )
  const quantityReturned = summary.rows.reduce(
    (total, row) => total + row.quantityReturned,
    0
  )
  const netsByCurrency = new Map<string, string>()
  for (const row of summary.rows) {
    const previous = netsByCurrency.get(row.currency) ?? '0'
    netsByCurrency.set(
      row.currency,
      (BigInt(previous) + BigInt(row.netAmount)).toString()
    )
  }
  const bucketSet =
    summary.monthlyBuckets.find(
      (entry) => entry.currency === context.tenant.defaultCurrency
    ) ?? summary.monthlyBuckets[0]

  if (summary.rows.length === 0 && !bucketSet)
    return <ItemSalesSummaryPanel state={{ status: 'empty' }} />

  return (
    <ItemSalesSummaryPanel
      state={{
        status: 'ready',
        data: {
          quantitySold,
          quantityReturned,
          netDisplay:
            netsByCurrency.size === 0
              ? formatMoney('0', context.tenant.defaultCurrency)
              : [...netsByCurrency]
                  .map(([currency, net]) => formatMoney(net, currency))
                  .join(' · '),
          monthlyBuckets: (bucketSet?.buckets ?? []).map((bucket) => ({
            key: String(bucket.start),
            label: formatBucketLabel(bucket.start, 'month', timeZone),
            valueLabel: formatMoney(
              bucket.netAmount,
              bucketSet?.currency ?? context.tenant.defaultCurrency
            ),
            rawValue: bucket.netAmount,
          })),
        },
      }}
    />
  )
}
