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

import { getInvoice } from '@/lib/invoice'
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
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.items.retrieve(itemId)
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
    <div className="flex items-center gap-3 border-b p-6">
      <Skeleton className="size-12 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-28 rounded-md" />
    </div>
  )
}
