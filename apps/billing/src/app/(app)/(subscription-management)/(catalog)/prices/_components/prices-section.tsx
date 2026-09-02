'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function PricesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = parseCatalogStatus(
    useSearchParams().get('status') ?? undefined
  )

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar {...CATALOG_LISTS.prices} status={status} />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
