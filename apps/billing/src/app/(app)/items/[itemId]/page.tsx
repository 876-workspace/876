import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ItemStockSummary } from '@876/billing-ui/item-stock-summary'
import { buttonVariants } from '@876/ui/button'

import { DetailField } from '@/components/patterns/detail/detail-field'
import { DetailActionList } from '@/components/patterns/detail/detail-action-list'
import { MetricCard } from '@/components/patterns/metric-card'
import { resolveItem } from '@/app/(app)/_lib/detail-data'
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

      {item.type === 'GOOD' ? (
        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Stock</h2>
          <ItemStockSummary
            type={item.type}
            trackStock={item.trackStock}
            stockQuantity={item.stockQuantity}
            lowStockThreshold={item.lowStockThreshold}
            allowOutOfStock={item.allowOutOfStock}
            action={
              item.trackStock && context.permissions.includes('catalog:write') ? (
                <Link
                  href={`/items/${item.id}/stock`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Adjust stock
                </Link>
              ) : null
            }
          />
        </section>
      ) : null}

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
              'Review identifiers, stock settings, and the latest update time.',
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
