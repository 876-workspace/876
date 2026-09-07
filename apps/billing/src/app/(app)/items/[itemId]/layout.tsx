import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { CatalogResourceActions } from '@/features/catalog/components/catalog-resource-actions'
import { resolveItem } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

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
          { label: 'Prices', href: `${base}/prices` },
          { label: 'Transactions', href: `${base}/transactions` },
          { label: 'Audit', href: `${base}/audit` },
        ]}
      />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function ItemHeaderData({ itemId }: { itemId: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null

  const item = await resolveItem(context.tenant.id, itemId)
  if (!item) notFound()

  return (
    <DetailCardHeader
      title={item.name}
      subtitle={
        <DetailCardMeta>
          <span className="876-eyebrow">Invoice item</span>
          <span className="truncate">
            {item.description ?? item.sku ?? 'Sellable invoice item'}
          </span>
        </DetailCardMeta>
      }
      actions={
        context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="item"
            resourceId={item.id}
            resourceName={item.name}
            isActive={item.isActive}
            returnHref="/items"
            editHref={`/items/${item.id}/edit`}
          />
        ) : null
      }
      closeHref="/items"
      closeLabel="Close record"
    />
  )
}

function ItemHeaderSkeleton() {
  return (
    <DetailCardHeader
      title={<Skeleton className="h-5 w-40" />}
      subtitle={<Skeleton className="h-4 w-52" />}
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      closeHref="/items"
      closeLabel="Close record"
    />
  )
}
