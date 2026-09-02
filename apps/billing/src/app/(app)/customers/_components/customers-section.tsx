'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { CustomersToolbar } from './customers-toolbar'

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/customers` prefix so the sidebar stays on Customers, but the
 * toolbar and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'import', 'edit'] as const

export function CustomersSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={<CustomersToolbar status={status} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
