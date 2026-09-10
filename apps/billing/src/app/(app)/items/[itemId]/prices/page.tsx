import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'

import { PricesTable } from '@/features/catalog/components/prices-table'
import { resolveItem } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

const priceSkeletonColumns: DataTableSkeletonColumn[] = [
  { label: 'Catalog target' },
  { label: 'Amount' },
  { label: 'Cadence' },
  { label: 'Model' },
  { label: 'Status', cell: 'badge' },
  { label: 'Actions', srOnly: true, width: '3rem' },
]

export default function ItemPricesPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  return (
    <Suspense
      fallback={<DataTableSkeleton columns={priceSkeletonColumns} rows={5} />}
    >
      <ItemPricesData params={params} />
    </Suspense>
  )
}

async function ItemPricesData({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [item, prices] = await Promise.all([
    resolveItem(context.tenant.id, itemId),
    service.prices.list(context.tenant.id, undefined, { itemId }),
  ])
  if (!item) notFound()

  return prices.length > 0 ? (
    <PricesTable prices={prices} />
  ) : (
    <div className="876-card text-muted-foreground p-8 text-center text-sm">
      This item has no prices yet.
    </div>
  )
}
