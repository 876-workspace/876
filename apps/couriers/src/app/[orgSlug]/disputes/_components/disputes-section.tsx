'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

export function DisputesSection({
  orgSlug,
  list,
  children,
}: {
  orgSlug: string
  list: ReactNode
  children: ReactNode
}) {
  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Disputes"
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/disputes/new`}
          primaryVariant="info"
          refresh
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
