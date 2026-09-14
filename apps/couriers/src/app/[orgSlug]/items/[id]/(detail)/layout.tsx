import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardMeta,
} from '@876/ui/detail-card'
import { CircleStackIcon, WrenchScrewdriverIcon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import { ItemActions } from '../_components/item-actions'

import { resolveItem, resolveItemTitle } from '../_lib/item-data'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params
  const titleName = await resolveItemTitle(orgSlug, id)
  if (!titleName) return { title: 'Item not found' }

  return { title: `${titleName} - Items` }
}

/**
 * The item record card in the detail column. Awaits `params` and nothing
 * else: the header streams behind its own boundary, where `notFound()` is
 * decided.
 */
export default async function ItemDetailLayout({ children, params }: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/items`

  return (
    <DetailCard aria-label="Item">
      <Suspense
        key={id}
        fallback={<ItemHeaderFallback closeHref={closeHref} />}
      >
        <ItemHeader orgSlug={orgSlug} id={id} closeHref={closeHref} />
      </Suspense>
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function ItemHeader({
  orgSlug,
  id,
  closeHref,
}: {
  orgSlug: string
  id: string
  closeHref: string
}) {
  const resolved = await resolveItem(orgSlug, id)
  if (!resolved) notFound()
  if (resolved.error) return null

  const item = resolved.item
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
      meta={
        <Badge variant={item.isActive ? 'success' : 'secondary'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      }
      subtitle={
        <DetailCardMeta>
          <span className="876-eyebrow">Catalog item</span>
          <span className="truncate">
            {item.sku
              ? `SKU ${item.sku}`
              : (item.unit ?? item.type.toLowerCase())}
          </span>
        </DetailCardMeta>
      }
      actions={
        <ItemActions
          orgSlug={orgSlug}
          itemId={item.id}
          isActive={item.isActive}
        />
      }
      closeHref={closeHref}
      closeLabel="Close item details"
    />
  )
}

function ItemHeaderFallback({ closeHref }: { closeHref: string }) {
  return (
    <DetailCardHeader
      icon={
        <DetailCardIcon>
          <Skeleton className="size-5 rounded" />
        </DetailCardIcon>
      }
      title={<Skeleton className="h-6 w-40" />}
      subtitle={<Skeleton className="h-4 w-24" />}
      closeHref={closeHref}
      closeLabel="Close item details"
    />
  )
}
