import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { CircleStackIcon, WrenchScrewdriverIcon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { resolveItemDetail } from '@/app/(app)/_lib/detail-data'
import { ItemActions } from './_components/item-actions'

export default async function ItemDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const base = `/items/${itemId}`

  return (
    <DetailCard aria-label="Item">
      <Suspense fallback={<ItemHeaderSkeleton />}>
        <ItemHeaderData itemId={itemId} />
      </Suspense>
      <DetailCardRouteTabs
        tabs={[
          { label: 'Overview', href: base, exact: true },
          { label: 'Transactions', href: `${base}/transactions` },
        ]}
      />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function ItemHeaderData({ itemId }: { itemId: string }) {
  const detail = await resolveItemDetail(itemId)
  if (!detail) redirect('/no-access')

  const { invoice, result } = detail
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return null
  }

  const item = result.data
  const isService = item.type === 'SERVICE'

  return (
    <DetailCardHeader
      icon={
        <DetailCardIcon>
          {isService ? (
            <WrenchScrewdriverIcon className="size-5" />
          ) : (
            <CircleStackIcon className="size-5" />
          )}
        </DetailCardIcon>
      }
      title={item.name}
      subtitle={item.sku ? `SKU ${item.sku}` : undefined}
      actions={
        <ItemActions
          itemId={item.id}
          itemName={item.name}
          isActive={item.isActive}
          canManage={invoice.role !== 'staff'}
        />
      }
      closeHref="/items"
      closeLabel="Close item details"
    />
  )
}

function ItemHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={
        <DetailCardIcon>
          <Skeleton className="size-5 rounded" />
        </DetailCardIcon>
      }
      title={<Skeleton className="h-6 w-40" />}
      subtitle={<Skeleton className="h-4 w-24" />}
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      closeHref="/items"
      closeLabel="Close item details"
    />
  )
}
