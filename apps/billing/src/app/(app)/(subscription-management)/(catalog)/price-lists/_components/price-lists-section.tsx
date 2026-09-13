'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import { CATALOG_LISTS } from '../../_components/catalog-list-config'

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/price-lists` prefix so the sidebar stays on Price Lists, but
 * the toolbar and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function PriceListsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = useSearchParams().get('status') ?? 'all'

  const { columns: _columns, ...toolbar } = CATALOG_LISTS.priceLists

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          {...toolbar}
          status={status}
          primary={toolbar.primary}
        />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
