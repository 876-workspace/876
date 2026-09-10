import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ItemStockSummary } from '@876/billing-ui/item-stock-summary'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeadline,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { resolveItemDetail } from '@/app/(app)/_lib/detail-data'
import { formatMoney } from '@/lib/format'

interface Props {
  params: Promise<{ itemId: string }>
}

export const metadata: Metadata = {
  title: 'Item',
  description: 'Item details.',
}

export default function ItemDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<ItemOverviewSkeleton />}>
      <ItemOverviewData params={params} />
    </Suspense>
  )
}

async function ItemOverviewData({ params }: Props) {
  const { itemId } = await params
  const detail = await resolveItemDetail(itemId)
  if (!detail) redirect('/no-access')

  const { invoice, result } = detail
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

function ItemOverviewSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading item overview">
      <DetailCardHeadline
        value={<Skeleton className="h-9 w-32" />}
        caption={<Skeleton className="h-4 w-64 max-w-full" />}
      />

      <DetailCardSection title="Description">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </DetailCardSection>

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

      <DetailCardSection title="Billing">
        <DetailCardFacts>
          <DetailCardFact
            label="Currency"
            value={<Skeleton className="h-4 w-14" />}
            mono
          />
          <DetailCardFact
            label="Tax"
            value={<Skeleton className="h-4 w-20" />}
          />
          <DetailCardFact
            label="Tax code"
            value={<Skeleton className="h-4 w-24" />}
            mono
          />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
