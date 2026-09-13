import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ItemStockSummary } from '@876/billing-ui/item-stock-summary'
import { AppError } from '@876/ui/app-error'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeadline,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { formatDate, formatMoney } from '@/lib/finance/format'

import { resolveItem } from '../_lib/item-data'
import {
  ItemSalesSummaryData,
  ItemSalesSummaryFallback,
} from '../_components/item-sales-summary'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function ItemOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<ItemOverviewFallback />}>
      <ItemOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function ItemOverviewFallback() {
  return (
    <div className="space-y-8" aria-label="Loading item overview">
      <DetailCardHeadline
        value={<Skeleton className="h-9 w-32" />}
        caption={<Skeleton className="h-4 w-64 max-w-full" />}
      />
      <DetailCardSection title="Stock">
        <DetailCardFacts>
          <DetailCardFact
            label="Quantity"
            value={<Skeleton className="h-4 w-16" />}
          />
          <DetailCardFact
            label="Status"
            value={<Skeleton className="h-4 w-20" />}
          />
          <DetailCardFact
            label="Low stock threshold"
            value={<Skeleton className="h-4 w-16" />}
          />
          <DetailCardFact
            label="Out-of-stock sales"
            value={<Skeleton className="h-4 w-20" />}
          />
        </DetailCardFacts>
      </DetailCardSection>
      <DetailCardSection title="Item">
        <DetailCardFacts>
          <DetailCardFact
            label="Type"
            value={<Skeleton className="h-4 w-20" />}
          />
          <DetailCardFact
            label="SKU"
            value={<Skeleton className="h-4 w-24" />}
            mono
          />
          <DetailCardFact
            label="Unit"
            value={<Skeleton className="h-4 w-16" />}
          />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}

async function ItemOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const resolved = await resolveItem(orgSlug, id)
  if (!resolved) notFound()
  if (resolved.error)
    return (
      <AppError
        title="Item could not be loaded"
        error={resolved.error}
        variant="section"
      />
    )

  const item = resolved.item
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
          />
        </DetailCardSection>
      ) : null}

      <Suspense fallback={<ItemSalesSummaryFallback />}>
        <ItemSalesSummaryData orgSlug={orgSlug} itemId={item.id} />
      </Suspense>

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
          <DetailCardFact label="Updated" value={formatDate(item.updatedAt)} />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
