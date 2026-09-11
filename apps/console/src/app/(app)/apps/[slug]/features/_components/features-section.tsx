'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { FeaturesToolbar } from './features-toolbar'

/**
 * Diagnostics owns the whole content area. Everything else — the record, its
 * tabs, and the new-feature form — opens in the detail column beside the list.
 */
const TAKEOVER_SEGMENTS = ['diagnostics'] as const

export function FeaturesSection({
  slug,
  list,
  children,
}: {
  slug: string
  list: ReactNode
  children: ReactNode
}) {
  return (
    <ListDetailSection
      toolbar={<FeaturesToolbar slug={slug} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
