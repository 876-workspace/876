import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { DetailActionList } from '@/components/detail-action-list'
import { MetricCard } from '@/components/metric-card'
import { resolveItem } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'

interface Props {
  params: Promise<{ itemId: string }>
}

export const metadata: Metadata = {
  title: 'Item details',
  description: 'Item pricing and document usage.',
}

export default async function ItemDetailPage({ params }: Props) {
  const { itemId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const item = await resolveItem(context.tenant.id, itemId)
  if (!item) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Default price"
          value={formatMoney(
            item.defaultSellingAmount,
            item.defaultSellingCurrency ?? context.tenant.defaultCurrency
          )}
          detail={item.unit ? `Per ${item.unit}` : 'Default selling price'}
        />
        <MetricCard
          label="Prices"
          value={item._count.prices}
          detail="Configured price records"
        />
        <MetricCard
          label="Documents"
          value={item._count.quoteLines + item._count.invoiceLines}
          detail={`${item._count.quoteLines} quotes, ${item._count.invoiceLines} invoices`}
        />
      </div>

      <DetailActionList
        title="Item workspace"
        description="Use prices for future sales terms and transactions to understand where this item affects customer documents."
        actions={[
          {
            href: `/items/${item.id}/prices`,
            label: 'Prices',
            description:
              'Review immutable price records and create a new price when an amount changes.',
            meta: item._count.prices,
          },
          {
            href: `/items/${item.id}/transactions`,
            label: 'Transactions',
            description:
              'See the quotes and invoices that reference this item.',
            meta: item._count.quoteLines + item._count.invoiceLines,
          },
          {
            href: `/items/${item.id}/audit`,
            label: 'Audit',
            description:
              'Review identifiers, inventory settings, and the latest update time.',
          },
        ]}
      />

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Item information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Type" value={item.type.toLowerCase()} />
          <DetailField label="SKU" value={item.sku ?? '—'} mono />
          <DetailField label="Unit" value={item.unit ?? '—'} />
          <DetailField
            label="Tax"
            value={item.isTaxable ? 'Taxable' : 'Non-taxable'}
          />
          <DetailField label="Tax code" value={item.taxCode ?? '—'} mono />
          <DetailField label="Updated" value={formatDate(item.updatedAt)} />
          <DetailField label="Item ID" value={item.id} mono />
        </dl>
      </section>
    </div>
  )
}
