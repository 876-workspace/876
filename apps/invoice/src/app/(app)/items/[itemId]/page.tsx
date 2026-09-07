import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ItemStockSummary } from '@876/billing-ui/item-stock-summary'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeadline,
  DetailCardSection,
} from '@876/ui/detail-card'

import { getInvoice } from '@/lib/invoice'
import { formatMoney } from '@/lib/format'

interface Props {
  params: Promise<{ itemId: string }>
}

export const metadata: Metadata = {
  title: 'Item',
  description: 'Item details.',
}

export default async function ItemDetailPage({ params }: Props) {
  const { itemId } = await params
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.items.retrieve(itemId)

  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return null
  }

  const item = result.data
  const currency = item.defaultSellingCurrency ?? 'JMD'
  const isService = item.type === 'SERVICE'
  const typeLabel = isService ? 'Service' : 'Good'

  return (
    <div className="space-y-8">
      <DetailCardHeadline
        value={formatMoney(item.defaultSellingAmount, currency)}
        caption={[
          'Default selling price',
          item.unit ? `per ${item.unit}` : null,
          item.isTaxable ? 'taxable' : 'non-taxable',
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      {item.description ? (
        <DetailCardSection title="Description">
          <p className="text-foreground text-sm leading-6">
            {item.description}
          </p>
        </DetailCardSection>
      ) : null}

      {!isService ? (
        <DetailCardSection title="Stock">
          <ItemStockSummary
            type={item.type}
            trackStock={item.trackStock}
            stockQuantity={item.stockQuantity}
            lowStockThreshold={item.lowStockThreshold}
            allowOutOfStock={item.allowOutOfStock}
            action={
              item.trackStock && invoice.role !== 'staff' ? (
                <Link
                  href={`/items/${item.id}/stock`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Adjust stock
                </Link>
              ) : null
            }
          />
        </DetailCardSection>
      ) : null}

      <DetailCardSection title="Item">
        <DetailCardFacts>
          <DetailCardFact label="Type" value={typeLabel} />
          <DetailCardFact label="SKU" value={item.sku ?? '—'} mono />
          <DetailCardFact label="Unit" value={item.unit ?? '—'} />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Billing">
        <DetailCardFacts>
          <DetailCardFact label="Currency" value={currency} mono />
          <DetailCardFact
            label="Tax"
            value={item.isTaxable ? 'Taxable' : 'Non-taxable'}
          />
          <DetailCardFact label="Tax code" value={item.taxCode ?? '—'} mono />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
