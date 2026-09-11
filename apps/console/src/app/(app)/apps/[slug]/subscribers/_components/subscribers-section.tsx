'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { SubscribersToolbar } from './subscribers-toolbar'

export function SubscribersSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  return (
    <ListDetailSection toolbar={<SubscribersToolbar />} list={list}>
      {children}
    </ListDetailSection>
  )
}
