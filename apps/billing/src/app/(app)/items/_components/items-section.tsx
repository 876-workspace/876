'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { ItemsToolbar } from './items-toolbar'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function ItemsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'active'

  return (
    <ListDetailSection
      toolbar={<ItemsToolbar status={status} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
