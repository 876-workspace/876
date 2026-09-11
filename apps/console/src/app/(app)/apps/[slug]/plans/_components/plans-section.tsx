'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { PlansToolbar } from './plans-toolbar'

/**
 * Every plan route — the record, its tabs, and the new/edit forms — opens in
 * the detail column beside the list; nothing takes over the content area.
 */
export function PlansSection({
  slug,
  list,
  children,
}: {
  slug: string
  list: ReactNode
  children: ReactNode
}) {
  return (
    <ListDetailSection toolbar={<PlansToolbar slug={slug} />} list={list}>
      {children}
    </ListDetailSection>
  )
}
