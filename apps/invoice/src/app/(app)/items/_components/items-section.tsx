'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { useListDetailRoute } from '@876/ui/list-detail-shell'

import { ItemsToolbar } from './items-toolbar'

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/items` prefix so the sidebar stays on Items, but the toolbar
 * and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function ItemsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const { open } = useListDetailRoute(TAKEOVER_SEGMENTS)
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={<ItemsToolbar status={status} showPrimary={!open} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
